var ooo = {};
module.exports = ooo;

var http = require('http');
var sockjs = require('sockjs');
var ooc = require('../client/source/ooc.js');

var SQR_NMASK = [[0, -1], [1, 0], [0, 1], [-1, 0]];
var HEX_NMASK = [[[0, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1]], [[1, -1], [1, 0], [1, 1], [0, 1], [-1, 0], [0, -1]]];

ooo.TileMap = ooc.Class.extend(function (size)
{
	ooc.Class.call(this);
	this.size = size;
	this.coords = [];
	this.tiles = [];

	//create tiles
	for (var y = 0, i = 0; y < size; y++)
	{
		this.coords[y] = [];

		for (var x = 0; x < size; x++, i++)
		{
			var tile = {};
			tile.map = this;
			tile.i = i;
			tile.x = x;
			tile.y = y;
			tile.data = this.initData(i, x, y);
			this.coords[y][x] = tile;
			this.tiles[i] = tile;
		}
	}

	//connect neighbors
	for (var y = 0; y < size; y++)
	{
		for (var x = 0; x < size; x++)
		{
			var steps = [];

			for (var i in SQR_NMASK)
			{
				var nx = (x + SQR_NMASK[i][0] + size) % size;
				var ny = (y + SQR_NMASK[i][1] + size) % size;
				steps[i] = this.coords[ny][nx];
			}

			this.coords[y][x].steps = steps;
		}
	}
});

ooo.TileMap.method('initData', function (i, x, y)
{
	return {type: 0};
});

ooo.TileMap.method('calcCost', function (data)
{
	return 1;
});

ooo.TileMap.method('calcDistance', function (a, b)
{
	//todo wrapping distances (left/right/top/mid/bottom) (see hexmap)
	throw 'TileMap distance calculation not implemented yet!!!';
	return Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
});

ooo.TileMap.method('findArea', function (open, range)
{
	for (var i = 0; i < open.length; i++)
	{
		open[i] = this.tiles[open[i]];
		open[i].g = 0;
	}

	var done = [];

	do
	{
		var current = open.pop();
		done[current.i] = current.g;//muss das evtl geupdated werden falls billiger geht?

		for (var i = 0; i < current.steps.length; i++)
		{
			var next = current.steps[i];

			if (next.i in done)
			{
				continue;
			}

			var next_c = this.calcCost.call(this, next.data);

			if (next_c == undefined)
			{
				continue;
			}

			var next_g = current.g + next_c;

			if (next_g > range)
			{
				continue;
			}

			var tile = null;

			for (var j in open)
			{
				if (open[j] == next)
				{
					tile = next;
					break;
				}
			}

			if (tile == null)
			{
				next.g = next_g;
				open.splice(ooc.sorted_index(open, next, 'g'), 0, next);
				continue;
			}

			if (next_g < tile.g)
			{
				tile.g = next_g;
			}
		}
	}
	while (open.length)

	return done;
});

ooo.TileMap.method('findPath', function (origin, target)
{
	if (origin.i == target.i)
	{
		return {tiles: [], steps: [], cost: 0};
	}

	var done = [];
	var crumbs = [];
	var open = [origin];
	origin.g = 0;
	origin.f = this.calcDistance.call(this, origin, target);

	do
	{
		var current = open.pop();
		done[current.i] = current.g;//muss das evtl geupdated werden falls billiger geht?

		for (var i = 0; i < current.steps.length; i++)
		{
			var next = current.steps[i];

			if (next.i in done)
			{
				continue;
			}

			var next_c = this.calcCost.call(this, next.data);

			if (next_c == undefined)
			{
				continue;
			}

			var next_g = current.g + next_c;

			if (next == target)
			{
				var tiles = [next.i];
				var steps = [i];

				while (current != origin)
				{
					tiles.push(current.i);
					steps.push(crumbs[current.i][0]);
					current = crumbs[current.i][1];
				}

				//rückgabewert prüfen/kann ich hier was mit done[] machen?
				return {tiles: tiles.reverse(), steps: steps.reverse(), cost: next_g};
			}

			var tile = null;

			for (var j in open)
			{
				if (open[j] == next)
				{
					tile = next;
					break;
				}
			}

			if (tile == null)
			{
				next.g = next_g;
				next.f = next_g + this.calcDistance.call(this, next, target);
				open.splice(ooc.sorted_index(open, next, 'f'), 0, next);
				crumbs[next.i] = [i, current];
				continue;
			}

			if (next_g < tile.g)
			{
				tile.g = next_g;
				tile.f = next_g + this.calcDistance.call(this, tile, target);
				crumbs[tile.i] = [i, current];
			}
		}
	}
	while (open.length)
});

ooo.Client = ooc.Class.extend(function (server, socket)
{
	ooc.Class.call(this);
	this.server = server;
	this.socket = socket;
	this.expected = {};
});

ooo.Client.method('send', function (type, data)
{
	var message = JSON.stringify(Array.prototype.slice.call(arguments));
	this.socket.write(message);
	return this;
});

ooo.Client.method('shout', function (type, data)
{
	for (var id in this.server.clients)
	{
		if (id == this.id)
		{
			continue;
		}

		this.server.clients[id].send(type, data);
	}

	return this;
});

ooo.Client.method('close', function (code)
{
	this.socket.close(code);
});

ooo.Client.method('expect', function ()
{
	this.expected = {};

	for (var i in arguments)
	{
		this.expected[arguments[i]] = true;
	}

	return this;
});

ooo.Client.method('trigger', function (type, argv)
{
	if (this.events && this.events.on && this.events.on[type])
	{
		try
		{
			this.events.on[type].apply(this, argv);
		}
		catch (e)
		{
			this.close(e.toString());
			console.log('CLIENT EXCEPTION');

			if (e.stack)
			{
				console.log(e.stack);
			}
			else
			{
				console.log(e.toString());
			}
		}
	}
});

ooo.Server = ooc.Class.extend(function (Client, port)
{
	console.log('OPEN %d', port);
	ooc.Class.call(this);
	this.http = http.createServer();
	this.http.listen(port);//, '0.0.0.0'
	this.sockjs = sockjs.createServer({'log': function (type, message) { if (type != 'info') { console.log(type, message) }}});
	this.sockjs.installHandlers(this.http);//, {prefix: '/player'}
	this.clients = {};
	var that = this;

	this.sockjs.on('connection', function (socket)
	{
		var client = new Client(that, socket);
		client.id = ooc.fill(client, that.clients);
		client.trigger('socket_open');

		socket.on('data', function (string)
		{
			var data = JSON.parse(string);

			if (!Array.isArray(data) || !Array.isArray(data[1]))
			{
				client.close('bad message');
				return;
			}

			var type = data[0];

			if (!client.expected[type])
			{
				var msg = 'unexpected message: ' + type;
				console.log(msg);
				client.close(msg);
				return;
			}

			client.expected = {};
			client.trigger('message_' + type, data[1]);
		});

		socket.on('close', function ()
		{
			delete that.clients[client.id];
			client.trigger('socket_close');
		});
	});
});

ooo.Server.method('broadcast', function (type, data)
{
	for (var id in this.clients)
	{
		var client = this.clients[id];
		client.send(type, data);
	}
});
