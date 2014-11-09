'use strict';
var oui = {};

//separate (replacable) tiledraw function in tilemap/hexmap (no event!)

(function ()
{
	function sorted_index (open, tile, prop)
	{
		var low = 0;
		var high = open.length;

		while (low < high)
		{
			var mid = (low + high) >>> 1;

			if (tile[prop] > open[mid][prop])
			{
				high = mid;
			}
			else
			{
				low = mid + 1;
			}
		}

		return low;
	}

	oui.Button = ooo.Cell.extend(function (button_w, button_h, source, styles, layout)
	{
		ooo.Cell.call(this, layout);
		this.button_w = button_w;
		this.button_h = button_h;
		this.source = source;
		this.styles = styles;
	});

	oui.Button.method('style', function (name)
	{
		var cols = Math.floor(this.image.width / this.button_w);
		var rows = Math.floor(this.image.height / this.button_h);

		this.tile_x = (this.styles[name] % cols) * this.button_w;
		this.tile_y = Math.floor(this.styles[name] / rows) * this.button_h;
	});

	oui.Button.on('show', function (root, parent)
	{
		ooo.Cell.prototype.events.on.show.call(this, root, parent);
		this.image = root.images[this.source];
		this.tiles = [];

		var cols = Math.floor(this.image.width / this.button_w);
		var rows = Math.floor(this.image.height / this.button_h);
		var name = Object.keys(this.styles)[0];

		this.tile_x = (this.styles[name] % cols) * this.button_w;
		this.tile_y = Math.floor(this.styles[name] / rows) * this.button_h;
	});

	oui.Button.on('draw', function (time, context)
	{
		context.drawImage(this.image, this.tile_x, this.tile_y, this.button_w, this.button_h, 0, 0, this.button_w, this.button_h);
	});

	oui.Form = ooo.Stage.extend(function (color, font, layout, align, baseline)
	{
		ooo.Stage.call(this, layout);
		this.color = color || '#f00';
		this.font = font || '24px sans-serif';
		this.align = align || 'start';
		this.baseline = baseline || 'top';
	});

	oui.Form.method('show', function (actor, layer)
	{
		ooo.Scene.prototype.show.call(this, actor, layer);

		if (!this.focus && (actor instanceof oui.Input))
		{
			this.focus = actor;
			actor.toggle();
		}

		return this;
	});

	oui.Form.method('reset', function ()
	{
		this.focus.toggle();
		delete this.focus;

		//for (var i = 0; i < this.children.length; i++)
		for (var id in this.children[0])
		{
			var child = this.children[0][id];

			if (child instanceof oui.Input)
			{
				if (!this.focus)
				{
					this.focus = child;
					child.toggle();
				}

				if (child.reset)
				{
					child.reset();
				}
			}
		}
	});

	oui.Form.on('input:press', function (time, char, key, shift)
	{
		if (key == 9)//tab
		{
			this.focus.toggle();
			var id = this.focus.id;
			var layer = this.children[this.focus.layer];
			var length = ooo.size(layer);

			do
			{
				id = ooo.wrap(shift ? id - 1 : id + 1, length);
				this.focus = layer[id];
			}
			while (!(this.focus instanceof oui.Input))

			this.focus.toggle();
			return false;
		}
	});

	oui.Form.on('draw', function (time, context)
	{
		context.fillStyle = '#555';
		context.fillRect(0, 0, this.width, this.height);
		context.fillStyle = this.color;
		context.font = this.font;
		context.textAlign = this.align;
		context.textBaseline = this.baseline;
	});

	oui.Form.prepare('input:press', function (time, char, key, shift)
	{
		if (this.parent.focus != this)
		{
			return false;
		}
	});

	oui.Form.bubble('form:submit', function (type, data)
	{
		console.log('submit %s %s', type, JSON.stringify(data));
	});

	oui.Input = ooo.Cell.extend(function (layout)//alphabet
	{
		ooo.Cell.call(this, layout);
		this.focus = false;
	});

	oui.Input.method('toggle', function ()
	{
		this.focus = !this.focus;
	});

	oui.Input.on('input:click', function (button, down_x, down_y)
	{
		this.parent.focus.toggle();
		this.parent.focus = this;
		this.toggle();
	});

	oui.Submit = oui.Input.extend(function (type, color, layout)
	{
		oui.Input.call(this, layout);
		this.type = type;
		this.color = color;
	});

	oui.Submit.on('input:click', function (button, down_x, down_y)
	{
		oui.Input.prototype.events.on['input:click'].call(this, button, down_x, down_y);
		this.parent.trigger('form:submit', [this.type, []]);
		return false;
	});

	oui.Submit.on('input:press', function (time, char, key, shift)
	{
		if (key == 13)//enter
		{
			this.parent.trigger('form:submit', [this.type, []]);
			return false;
		}
	});

	oui.Submit.on('draw', function (time, context)
	{
		context.fillStyle = this.color;
		context.fillRect(0, 0, this.width, this.height);
		context.fillStyle = '#555';
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		context.fillText(this.type, this.width >>> 1, this.height >>> 1);
	});

	oui.Field = oui.Input.extend(function (type, layout)//alphabet
	{
		oui.Input.call(this, layout);
		this.type = type;
		this.reset();
	});

	oui.Field.method('reset', function ()
	{
		this.chars = [];
		this.caret = 0;
		this.text = '';
		this.sub = '';
	});

	oui.Field.on('form:submit', function (type, data)
	{
		data.push(this.text);
	});

	oui.Field.on('input:press', function (time, char, key, shift)
	{
		if (key == 13)//enter
		{
			this.parent.trigger('form:submit', [this.type, []]);
			return false;
		}
		else if (key == 8)//backspace
		{
			if (this.caret > 0)
			{
				this.caret--;
				this.chars.splice(this.caret, 1);
			}
		}
		else if (key == 46)//delete
		{
			if (this.caret < this.chars.length)
			{
				this.chars.splice(this.caret, 1);
			}
		}
		else if (key == 37)//left
		{
			if (this.caret > 0)
			{
				this.caret--;
			}
		}
		else if (key == 39)//right
		{
			if (this.caret < this.chars.length)
			{
				this.caret++;
			}
		}
		else if (char)
		{
			this.chars.splice(this.caret, 0, char);
			this.caret++;
		}
		else
		{
			return;
		}

		this.text = this.chars.join('');
		this.sub = this.text.substr(0, this.caret);
	});

	oui.Field.on('draw', function (time, context)
	{
		//context.drawImage(this.image, this.img_x, this.img_y, this.width, this.height, 0, 0, this.width, this.height);
		context.fillText(this.text, 0, 0);

		if (this.focus && ((time % 2000) < 1300))//caret blink
		{
			context.fillRect(context.measureText(this.sub).width, 0, this.height >>> 3, this.height);
		}
	});

	oui.Count = oui.Input.extend(function (min, max, init, layout)
	{
		oui.Input.call(this, layout);
		this.min = min;
		this.max = max;
		this.init = init;
		this.reset();
	});

	oui.Count.method('reset', function ()
	{
		this.number = this.init;
	});

	oui.Count.on('form:submit', function (type, data)
	{
		data.push(this.number);
	});

	oui.Count.on('input:click', function (button, down_x, down_y)
	{
		oui.Input.prototype.events.on['input:click'].call(this, down_x, down_y);

		if (down_x < (this.width >>> 1))
		{
			if (this.number > this.min)
			{
		 		this.number--;
			}
			else
			{
		 		this.number = this.max;
			}
		}
		else
		{
			if (this.number < this.max)
			{
		 		this.number++;
			}
			else
			{
		 		this.number = this.min;
			}
		}
	});

	oui.Count.on('draw', function (time, context)
	{
		//context.drawImage(this.image, this.img_x, this.img_y, this.width, this.height, 0, 0, this.width, this.height);
		context.fillText(this.number, 0, 0);
	});

	oui.Option = oui.Input.extend(function (options, init, type, layout)
	{
		oui.Input.call(this, type, layout);
		this.options = options;
		this.init = init;
		this.reset();
	});

	oui.Option.method('reset', function ()
	{
		this.pick = this.init;
	});

	oui.Option.on('form:submit', function (type, data)
	{
		data.push(this.pick);
	});

	oui.Option.on('input:click', function (button, down_x, down_y)
	{
		oui.Input.prototype.events.on['input:click'].call(this, down_x, down_y);
		down_x < (this.width >>> 1) ? this.pick-- : this.pick++;
		this.pick = ooo.wrap(this.pick, this.options.length);
	});

	oui.Option.on('draw', function (time, context)
	{
		//context.drawImage(this.image, this.img_x, this.img_y, this.width, this.height, 0, 0, this.width, this.height);
		context.fillText(this.options[this.pick], 0, 0);
	});

	oui.Switch = oui.Input.extend(function (init, layout)
	{
		oui.Input.call(this, layout);
		this.init = init;
		this.reset();
	});

	oui.Switch.method('reset', function ()
	{
		this.state = this.init;
	});

	oui.Switch.on('form:submit', function (type, data)
	{
		data.push(this.state);
	});

	oui.Switch.on('input:click', function (button, down_x, down_y)
	{
		oui.Input.prototype.events.on['input:click'].call(this, down_x, down_y);
		this.state = this.state ? 0 : 1;
	});

	oui.Switch.on('draw', function (time, context)
	{
		//context.drawImage(this.image, this.img_x, this.img_y, this.width, this.height, 0, 0, this.width, this.height);
		context.fillText(this.state, 0, 0);
	});

	oui.Menu = ooo.Cell.extend(function (button_w, button_h, type, layout, vertical, reversed)//switch to oui.Button.extend
	{
		ooo.Cell.call(this, layout);
		this.button_w = button_w;
		this.button_h = button_h;
		this.type = type;
		this.vertical = vertical;
		this.reversed = reversed;
		this.offset_x = vertical ? 0 : reversed ? -button_w : button_w;
		this.offset_y = vertical ? reversed ? -button_h : button_h : 0;
		this.options = [];
	});

	oui.Menu.method('reset', function (options)
	{
		this.options = options || [];
		return this;
	});

	oui.Menu.on('show', function (root, parent)
	{
		ooo.Cell.prototype.events.on.show.call(this, root, parent);
		this.image = root.images[this.type];
		this.tiles = [];

		var cols = Math.floor(this.image.width / this.button_w);
		var rows = Math.floor(this.image.height / this.button_h);

		for (var y = 0; y < rows; y++)
		{
			for (var x = 0; x < cols; x++)
			{
				this.tiles.push([x * this.button_w, y * this.button_h]);
			}
		}
	});

	oui.Menu.on('draw', function (time, context)
	{
		if (this.reversed)
		{
			if (this.vertical)
			{
				context.translate(0, this.height - this.button_h);
			}
			else
			{
				context.translate(this.width - this.button_w, 0);
			}
		}

		for (var i = 0; i < this.options.length; i++)
		{
			var index = this.options[i];
			context.drawImage(this.image, this.tiles[index][0], this.tiles[index][1], this.button_w, this.button_h, 0, 0, this.button_w, this.button_h);
			context.translate(this.offset_x, this.offset_y);
		}
	});

	oui.Menu.on('input:click', function (button, down_x, down_y)
	{
		if (this.vertical)
		{
			if (this.reversed)
			{
				var i = Math.floor((this.height - down_y) / this.button_h);
			}
			else
			{
				var i = Math.floor(down_y / this.button_h);
			}
		}
		else
		{
			if (this.reversed)
			{
				var i = Math.floor((this.width - down_x) / this.button_w);
			}
			else
			{
				var i = Math.floor(down_x / this.button_w);
			}
		}

		if (this.options[i] != undefined)
		{
			this.trigger('input:pick', [this.options[i], i]);
			return false;
		}
	});

	oui.SingleMenu = oui.Menu.extend(function (button_w, button_h, image, layout, vertical, reversed)
	{
		oui.Menu.apply(this, arguments);
	});

	oui.SingleMenu.method('reset', function (options)
	{
		this.options = options || [];
		delete this.picked;
		return this;
	});

	oui.SingleMenu.on('draw', function (time, context)
	{
		if (this.reversed)
		{
			if (this.vertical)
			{
				context.translate(0, this.height - this.button_h);
			}
			else
			{
				context.translate(this.width - this.button_w, 0);
			}
		}

		for (var i = 0; i < this.options.length; i++)
		{
			if (this.picked == i)
			{
				context.fillStyle = '#f00';
				context.fillRect(0, 0, this.button_w, this.button_h);
			}
			else
			{
				var type = this.options[i];
				context.drawImage(this.image, this.tiles[type][0], this.tiles[type][1], this.button_w, this.button_h, 0, 0, this.button_w, this.button_h);
			}

			context.translate(this.offset_x, this.offset_y);
		}
	});

	oui.SingleMenu.on('input:click', function (button, down_x, down_y)
	{
		if (this.vertical)
		{
			if (this.reversed)
			{
				var i = Math.floor((this.height - down_y) / this.button_h);
			}
			else
			{
				var i = Math.floor(down_y / this.button_h);
			}
		}
		else
		{
			if (this.reversed)
			{
				var i = Math.floor((this.width - down_x) / this.button_w);
			}
			else
			{
				var i = Math.floor(down_x / this.button_w);
			}
		}

		if (this.options[i] != undefined)
		{
			this.picked = i;
			this.trigger('select', [this.options[i], i]);
			return false;
		}
	});

	oui.MultiMenu = oui.Menu.extend(function (button_w, button_h, image, layout)
	{
		oui.Menu.apply(this, arguments);
	});

	oui.MultiMenu.method('reset', function (options)
	{
		this.options = options || [];
		this.picked = [];

		for (var i = 0; i < this.options.length; i++)
		{
			this.picked[i] = false;
		}

		return this;
	});

	oui.MultiMenu.on('draw', function (time, context)
	{
		if (this.reversed)
		{
			if (this.vertical)
			{
				context.translate(0, this.height - this.button_h);
			}
			else
			{
				context.translate(this.width - this.button_w, 0);
			}
		}

		for (var i = 0; i < this.options.length; i++)
		{
			if (this.picked[i])
			{
				context.fillStyle = '#f00';
				context.fillRect(0, 0, this.button_w, this.button_h);
			}
			else
			{
				var type = this.options[i];
				context.drawImage(this.image, this.tiles[type][0], this.tiles[type][1], this.button_w, this.button_h, 0, 0, this.button_w, this.button_h);
			}

			context.translate(this.offset_x, this.offset_y);
		}
	});

	oui.MultiMenu.on('input:click', function (button, down_x, down_y)
	{
		if (this.vertical)
		{
			if (this.reversed)
			{
				var i = Math.floor((this.height - down_y) / this.button_h);
			}
			else
			{
				var i = Math.floor(down_y / this.button_h);
			}
		}
		else
		{
			if (this.reversed)
			{
				var i = Math.floor((this.width - down_x) / this.button_w);
			}
			else
			{
				var i = Math.floor(down_x / this.button_w);
			}
		}

		if (this.options[i] != undefined)
		{
			this.picked[i] = !this.picked[i];
			var selection = [];

			for (var j = 0; j < this.options.length; j++)
			{
				if (this.picked[j])
				{
					selection.push(this.options[j]);
				}
			}

			this.trigger('pick', [selection, this.options[i], i]);
			return false;
		}
	});

	var SQR_NMASK = [[0, -1], [1, 0], [0, 1], [-1, 0]];
	var HEX_NMASK = [[[0, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1]], [[1, -1], [1, 0], [1, 1], [0, 1], [-1, 0], [0, -1]]];

	oui.TileMap = ooo.Cell.extend(function (size, tile_w, tile_h, type, layout)
	{
		ooo.Cell.call(this, layout);
		this.size = size;
		this.tile_w = tile_w;
		this.tile_h = tile_h;
		this.type = type;
		this.patch_w = size * tile_w;
		this.patch_h = size * tile_h;
		this.drag_x = 0;
		this.drag_y = 0;
		this.drop_x = 0;
		this.drop_y = 0;
		this.tiles = [];
		this.index = [];

		//create tiles
		for (var y = 0, i = 0; y < size; y++)
		{
			this.tiles[y] = [];

			for (var x = 0; x < size; x++, i++)
			{
				var tile = {};
				tile.map = this;
				tile.i = i;
				tile.x = x;
				tile.y = y;
				tile.data = new this.Data(this, i, x, y);
				this.tiles[y][x] = tile;
				this.index[i] = tile;
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
					steps[i] = this.tiles[ny][nx];
				}

				this.tiles[y][x].steps = steps;
			}
		}
	});

	oui.TileMap.method('Data', function (map, i, x, y)
	{
		this.type = 0;
	});

	oui.TileMap.method('costs', function (data)
	{
		return 1;
	});

	oui.TileMap.method('drawTile', function (tile, time, context)
	{
		context.drawImage(this.image, this.coords[tile.data.type][0], this.coords[tile.data.type][1], this.tile_w, this.tile_h, 0, 0, this.tile_w, this.tile_h);
	});

	oui.TileMap.method('distance', function (a, b)
	{
		if (a.x < b.x)
		{
			var min_x = Math.min(b.x - a.x, a.x - (b.x - this.size));
		}
		else
		{
			var min_x = Math.min(a.x - b.x, (b.x + this.size) - a.x);
		}

		if (a.y < b.y)
		{
			var min_y = Math.min(b.y - a.y, a.y - (b.y - this.size));
		}
		else
		{
			var min_y = Math.min(a.y - b.y , (b.y + this.size) - a.y);
		}

		return (min_x + min_y);
	});

	oui.TileMap.method('findArea', function (origin, range, costs)
	{
		if (!costs)
		{
			costs = this.costs;
		}

		var done = [];
		var open = [origin];
		origin.g = 0;

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

				var next_c = costs(next.data);

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
					open.splice(sorted_index(open, next, 'g'), 0, next);
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

	oui.TileMap.method('findPath', function (origin, target, costs)
	{
		if (!costs)
		{
			costs = this.costs;
		}

		var done = [];
		var crumbs = [];
		var open = [origin];
		origin.g = 0;
		origin.f = this.distance(origin, target);

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

				var next_c = costs(next.data);

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
					next.f = next_g + this.distance(next, target);
					open.splice(sorted_index(open, next, 'f'), 0, next);
					crumbs[next.i] = [i, current];
					continue;
				}

				if (next_g < tile.g)
				{
					tile.g = next_g;
					tile.f = next_g + this.distance(tile, target);
					crumbs[tile.i] = [i, current];
				}
			}
		}
		while (open.length)
	});

	oui.TileMap.on('show', function (root, parent)
	{
		ooo.Cell.prototype.events.on.show.call(this, root, parent);
		this.image = root.images[this.type];
		this.coords = [];

		var cols = Math.floor(this.image.width / this.tile_w);
		var rows = Math.floor(this.image.height / this.tile_h);

		for (var y = 0; y < rows; y++)
		{
			for (var x = 0; x < cols; x++)
			{
				this.coords.push([x * this.tile_w, y * this.tile_h]);
			}
		}
	});

	oui.TileMap.on('input:drag', function (drag_x, drag_y)
	{
		this.drag_x = drag_x;
		this.drag_y = drag_y;
	});

	oui.TileMap.on('input:drop', function (drop_x, drop_y)
	{
		this.drop_x = ooo.wrap(this.drop_x - this.drag_x, this.patch_w);
		this.drop_y = ooo.wrap(this.drop_y - this.drag_y, this.patch_h);
		this.drag_x = 0;
		this.drag_y = 0;
	});

	oui.TileMap.on('input:click', function (button, down_x, down_y)
	{
		var tile_x = Math.floor(((this.drop_x + down_x) % this.patch_w) / this.tile_w);
		var tile_y = Math.floor(((this.drop_y + down_y) % this.patch_h) / this.tile_h);
		this.trigger('input:pick', [this.tiles[tile_y][tile_x], button, tile_x, tile_y]);
	});

	oui.TileMap.on('draw', function (time, context)
	{
		var drop_x = ooo.wrap(this.drop_x - this.drag_x, this.patch_w);
		var drop_y = ooo.wrap(this.drop_y - this.drag_y, this.patch_h);
		var start_x = Math.floor(drop_x / this.tile_w);
		var start_y = Math.floor(drop_y / this.tile_h);
		var end_x = start_x + Math.ceil(this.width / this.tile_w);
		var end_y = start_y + Math.ceil(this.height / this.tile_h);

		context.translate(-(drop_x % this.tile_w), -(drop_y % this.tile_h));

		for (var y = start_y; y <= end_y; y++)
		{
			var tile_y = y % this.size;
			context.save();

			for (var x = start_x; x <= end_x; x++)
			{
				var tile_x = x % this.size;
				var tile = this.tiles[tile_y][tile_x];
				this.drawTile(tile, time, context);
				context.translate(this.tile_w, 0);
			}

			context.restore();
			context.translate(0, this.tile_h);
		}
	});

	oui.HexMap = oui.TileMap.extend(function (size, tile_w, tile_h, type, layout)
	{
		oui.TileMap.apply(this, arguments);
		this.tile_w2 = tile_w >>> 1;
		this.tile_h2 = tile_h >>> 1;
		this.tile_h4 = tile_h >>> 2;
		this.tile_3h4 = this.tile_h2 + this.tile_h4;
		this.patch_h = size * this.tile_3h4;
		var hex_d = Math.sqrt(this.tile_w2 * this.tile_w2 + this.tile_3h4 * this.tile_3h4);//hex diagonale
		this.hex_r = hex_d / 2;//radius
		this.hex_x = this.tile_w2 / hex_d;
		this.hex_y = this.tile_3h4 / hex_d;
		this.size2 = size >>> 1;
		this.size32 = size + this.size2;
		this.tiles = [];
		this.index = [];

		//create tiles
		for (var y = 0, i = 0; y < size; y++)
		{
			this.tiles[y] = [];

			for (var x = 0; x < size; x++, i++)
			{
				var tile = {};
				tile.i = i;
				tile.x = x - (y >> 1);
				tile.y = y;
				tile.z = -tile.x - y;
				tile.type = 0;
				this.tiles[y][x] = tile;
				this.index[i] = tile;
			}
		}

		//connect neighbors
		for (var y = 0; y < size; y++)
		{
			var nmask = HEX_NMASK[y & 1];

			for (var x = 0; x < size; x++)
			{
				var steps = [];

				for (var i = 0; i < nmask.length; i++)
				{
					var nx = (x + nmask[i][0] + size) % size;
					var ny = (y + nmask[i][1] + size) % size;
					steps[i] = this.tiles[ny][nx];
				}

				this.tiles[y][x].steps = steps;
			}
		}
	});

	//private HexMap
	function wrapDist (dx, dy, dz)
	{
		var dist1 = Math.max(Math.abs(this.size2 + dx), this.size - dy, Math.abs(this.size2 + dz));
		var dist2 = Math.max(Math.abs(this.size2 - dx), this.size - dy, Math.abs(this.size32 + dz));
		var dist3 = Math.max(Math.abs(this.size - dx), dy, Math.abs(this.size + dz));
		return Math.min(dist1, dist2, dist3);
	}

	oui.HexMap.method('distance', function (a, b)
	{
		var dx = b.x - a.x;
		var dy = b.y - a.y;
		var dz = b.z - a.z;
		var dist = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));

		if (dist > this.size2)
		{
			if (dy == 0 || dx == dz)
			{
				return (this.size - dist);
			}
			else if (dx > dz)//rechts
			{
				if (dy > 0)//unten
				{
					var quad = wrapDist.call(this, dx, dy, dz);
				}
				else//oben
				{
					var quad = wrapDist.call(this, -dz, -dy, -dx);
				}
			}
			else//links
			{
				if (dy > 0)//unten
				{
					var quad = wrapDist.call(this, dz, dy, dx);
				}
				else//oben
				{
					var quad = wrapDist.call(this, -dx, -dy, -dz);
				}
			}
		}

		return (dist > quad ? quad : dist);
	});

	oui.HexMap.on('input:click', function (button, down_x, down_y)
	{
		var raw_x = (this.drop_x + down_x) % this.patch_w;
		var raw_y = (this.drop_y + down_y) % this.patch_h;
		var rel_x = raw_x % this.tile_w2;
		var rel_y = raw_y % this.tile_3h4;
		var min_x = Math.round((raw_x - rel_x) / this.tile_w2);
		var min_y = Math.round((raw_y - rel_y) / this.tile_3h4);

		if ((min_x & 1) == (min_y & 1))
		{
			if ((rel_x * this.hex_x + rel_y * this.hex_y) < this.hex_r)
			{
				var tile_x = (min_x >> 1) % this.size;
				var tile_y = min_y % this.size;
			}
			else
			{
				var tile_x = ((min_x + 1) >> 1) % this.size;
				var tile_y = (min_y + 1) % this.size;
			}
		}
		else
		{
			if (((rel_x - this.tile_w2) * -this.hex_x + rel_y * this.hex_y) < this.hex_r)
			{
				var tile_x = ((min_x + 1) >> 1) % this.size;
				var tile_y = min_y % this.size;
			}
			else
			{
				var tile_x = (min_x >> 1) % this.size;
				var tile_y = (min_y + 1) % this.size;
			}
		}

		this.trigger('input:pick', [this.tiles[tile_y][tile_x], button, tile_x, tile_y]);
	});

	oui.HexMap.on('draw', function (time, context)
	{
		var drop_x = ooo.wrap(this.drop_x - this.drag_x, this.patch_w);
		var drop_y = ooo.wrap(this.drop_y - this.drag_y, this.patch_h);
		var start_x = Math.floor(drop_x / this.tile_w);
		var start_y = Math.floor(drop_y / this.tile_3h4);
		var end_x = start_x + Math.ceil(this.width / this.tile_w) + 1;//besser berechnen als + 1 (width + tile_w2??)
		var end_y = start_y + Math.ceil(this.height / this.tile_3h4) + 1;

		context.translate(-((drop_x % this.tile_w) + this.tile_w2), -((drop_y % this.tile_3h4) + this.tile_h2));
		//context.translate(-((drop_x % this.tile_w)), -((drop_y % this.tile_3h4)));

		for (var y = start_y; y <= end_y; y++)
		{
			var tile_y = y % this.size;
			context.save();

			if (y & 1)
			{
				context.translate(this.tile_w2, 0);
			}

			for (var x = start_x; x <= end_x; x++)
			{
				var tile_x = x % this.size;
				var tile = this.tiles[tile_y][tile_x];
				context.drawImage(this.image, this.coords[tile.type][0], this.coords[tile.type][1], this.tile_w, this.tile_h, 0, 0, this.tile_w, this.tile_h);

				if ('mark' in tile)
				{
					context.drawImage(this.image, this.coords[tile.mark][0], this.coords[tile.mark][1], this.tile_w, this.tile_h, 0, 0, this.tile_w, this.tile_h);
				}

				//context.fillText(tile.group.i, 10, 10);
				context.translate(this.tile_w, 0);
			}

			context.restore();
			context.translate(0, this.tile_3h4);
		}
	});
})();