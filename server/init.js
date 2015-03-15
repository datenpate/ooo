var ooo = require('./ooo.js');
var ooc = require('../client/source/ooc.js');
var http = require('http');
var node_static = require('node-static');

var WorldMap = ooo.TileMap.extend(function ()
{
	ooo.TileMap.call(this, 8);
	this.terrain = [2,2,2,0,0,2,2,2,
					2,0,0,0,0,0,2,2,
					0,0,1,1,0,0,0,2,
					0,0,1,0,0,1,0,0,
					2,0,0,0,1,1,0,0,
					2,2,0,0,1,0,0,2,
					2,2,2,0,0,0,2,2,
					2,2,2,2,0,2,2,2];

	for (var i = 0; i < this.terrain.length; i++)
	{
		this.tiles[i].data.type = this.terrain[i];
	}
});

// serve client
var static_directory = new node_static.Server('client/');
var static_server = http.createServer();
static_server.addListener('request', function(req, res) {
	static_directory.serve(req, res);
});
static_server.listen(11155, '0.0.0.0');

//connection object (non persistent)
var Client = ooo.Client.extend(function (server, socket)
{
	ooo.Client.call(this, server, socket);
});

Client.on('socket_open', function ()
{
	console.log('OPEN %d', this.id);
	//var home = Math.floor(Math.random() * world.size);
	var home = 28;
	var spawns = ooc.propArray(server.clients, 'home');
	this.home = home;

	this.send('world', [world.size, world.terrain, home, spawns]).shout('spawn', [this.id, home]).expect('move');
});

Client.on('message_move', function (home)
{
	console.log('MOVE %d %d', this.id, home);
	this.home = home;
	this.shout('spawn', [this.id, home]).expect('move');
});

Client.on('socket_close', function ()
{
	console.log('CLOSE %d', this.id);
	this.shout('vanish', [this.id]);
});

var world = new WorldMap();
var server = new ooo.Server(Client, 11133);
