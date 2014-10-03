oO = function ()
{
	var json = [];
	var fail = [];

	for (var i in arguments)
	{
		var arg = arguments[i];

		try
		{
			json.push(JSON.stringify(arg));
		}
		catch (e)
		{
			fail.push(arg);
		}
	};

	if (json.length)
	{
		console.log(json.join(' '));
	}

	for (var i in fail)
	{
		console.log(fail[i]);
	}
}

util = {};

(function ()
{
	var _PI = Math.PI;
	var _2PI = 2*Math.PI;

	util.preload = function (assets, callback)
	{
		var images = {};
		var toload = util.size(assets);
		var loaded = 0;

		for (var name in assets)
		{
			images[name] = new Image();

			images[name].onload = function()
			{
				loaded++;

				if (loaded == toload)
				{
					callback(images);
				}
			};

			images[name].src = assets[name];
		}
	}

	util.size = function (object)
	{
		return Object.keys(object).length;
	}

	util.sum = function (object)
	{
		var sum = 0;

		for (var i in object)
		{
			sum += object[i];
		}
		
		return sum;
	}

	util.fill = function (object, value)
	{
		var keys = Object.keys(object);

		for (var id = 0; id < keys.length; id++)
		{
			if (id != keys[id])
			{
				break;
			}
		}

		object[id] = value;
		return id;
	}

	util.add = function (object, value)
	{
		var pointer = object;
		var loops = arguments.length - 1;
		var key = null;

		for (var i = 2; i < loops; i++)
		{
			key = arguments[i];

			if (!pointer[key])
			{
				pointer[key] = {};
			}

			pointer = pointer[key];
		}
		
		pointer[arguments[i]] = value;
	}

	util.remove = function (object)
	{
		var pointers = [object];
		var loops = arguments.length - 1;

		for (var i = 1; i < loops; i++)
		{
			pointers[i] = pointers[i - 1][arguments[i]];
		}

		//besser lösen?
		if (!pointers[i - 1])
		{
			return;
		}
		
		delete pointers[i - 1][arguments[i]];

		for (i--; i > 0; i--)
		{
		    if (Object.keys(pointers[i]).length === 0)
		    {
		        delete pointers[i - 1][arguments[i]];
		    }
		}
	}

	util.bow = function (angle)
	{
		if (angle > _PI)
		{
			angle -= _2PI;
		}
		else if (angle < -_PI)
		{
			angle += _2PI;
		}

		return angle;
	}

	/*util.push = function (object, value)
	{
		var pointer = object;
		var loops = arguments.length - 1;
		var key;

		for (var i = 2; i < loops; i++)
		{
			key = arguments[i];

			if (!pointer[key])
			{
				pointer[key] = {};
			}

			pointer = pointer[key];
		}
		
		key = arguments[i];

		if (!pointer[key])
		{
			pointer[key] = [];
		}
		
		pointer[key].push(value);
	};*/

	util.each = function (object, depth, func, context)
	{
		if (depth === 1)
		{
			for (var key in object)
			{
				func.call(context, object[key]);
			}
		}
		else
		{
			depth--;

			for (var key in object)
			{
				util.each(object[key], depth, func, context);
			}
		}
	}

	util.each2d = function (object, func, context)
	{
		for (var key in object)
		{
			var child = object[key];

			for (var key in child)
			{
				func.call(context, child[key]);
			}
		}
	}

	/*util.count = function (secs, update, finish, context)
	{
		if (secs === 0)
		{
			if (finish)
			{
				finish.call(context);
			}
		}
		else
		{
			update.call(context, secs);
			setTimeout(function () { util.count(secs - 1, update, finish) }, 1000);
		}
	};*/

	/*util.shuffle = function (object)//exchange/change/mix
	{
		//do something
		return object;
	};*/

	util.clone = function (object)
	{
		var clone = {};

		for (var key in object)
		{
			clone[key] = object[key];
		}

		return clone;
	}

	/*util.extend = function (Parent, func)
	{
		var Child = function ()
		{
			Parent.call(this);
			func.apply(this, arguments);
		};

		Child.prototype = new Parent();
		Child.prototype.constructor = Child;
		return Child;
	};

	util.method = function (Const, name, func)
	{
		Const.prototype[name] = func;
	};*/
})();

if (typeof module === 'object')
{
	module.exports = util;
}