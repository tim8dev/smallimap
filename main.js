/*jslint white: true, browser: true */
/*global Color: true */
var generateGrid = function (world, width, height, dot) {
    "use strict";
    var grid = [],
        convertToWorldX = function(x) {
	    return Math.floor(x*world.length/width);
	},
        convertToWorldY = function(y) {
	    return Math.floor(y*world[0].length/height);
	}, 
        landinessOf = function(x, y) {
	    var worldXStart = convertToWorldX(x),
	        worldXEnd = convertToWorldX(x+1)-1,
	        worldYStart = convertToWorldY(y),
	        worldYEnd = convertToWorldY(y+1)-1,
	        totalCount = 0, existsCount = 0, i, j;
	    
	    for(i = worldXStart; i <= worldXEnd; i += 1) {
	        for(j = worldYStart; j <= worldYEnd; j += 1) {
		    totalCount += 1;
		    if(world[i] && world[i][j]) { existsCount += 1; }
		}
	    }

	    return existsCount/totalCount;
	}, x, y, wx, wy;
    
    for(x = 0; x < width; x += 1) {
	for(y = 0; y < height; y += 1) {
	    grid[x] = grid[x] || [];
	    grid[x][y] = dot(x,y,landinessOf(x,y));
	}
    }
    return grid;
  }, praiseplay = function (cwidth, cheight, ctx, world) {
    "use strict";
    var dotRadius = 3.2,
        dotDiameter = dotRadius*2,
	width = cwidth/dotDiameter,
        height = cheight/dotDiameter,
        colorForLandiness = function (landiness) {
	    var darkness = landiness * landiness * landiness * 0.64;
	    return new Color("#fff").darken(darkness);
	},
        overlayColor = function (x, y) {
	    var rel = y/height,
	        start = new Color("#3C90C9"),
	        end = new Color("#275080");
	    return start.mix(end, rel);
	}, dot = function (x, y, landiness) {
	    return {
		x: x, y: y, landiness: landiness,
		initial: {
		  color: colorForLandiness(landiness), radius: dotRadius * 0.64 
		},
		target : {}, dirty: true
	    };
	},	
        grid = generateGrid(world, width, height, dot),
        render = function (x, y, millis) {
	    var color, radius, dot = grid[x][y];
	    
	    color = dot.target.color || dot.initial.color;
	    radius = dot.target.radius || dot.initial.radius;

	    ctx.clearRect(x*dotDiameter, y*dotDiameter, dotDiameter, dotDiameter);
	    ctx.fillStyle = color.rgbString();
	    ctx.beginPath();
	    ctx.arc(x*dotDiameter + dotRadius, y*dotDiameter + dotRadius, radius, 0, Math.PI*2, true);
	    ctx.closePath();
	    ctx.fill();

	    dot.dirty = false;
	    dot.target = {};
	},
        setRadius = function (x, y, r) {
	    var target = grid[x][y].target;
	    if(target.radius) {
	        target.radius = target.radius/2 + r/2;
	    } else {
	        target.radius = r;
	    }
	    grid[x][y].dirty = true;
	},
        setColor = function (x, y, color) {
	    var target = grid[x][y].target;
	    if(target.color) {
	        target.color = target.color.mix(color);
	    } else {
		target.color = color;
	    }
	    grid[x][y].dirty = true;
	}, longToX = function (longitude) {
	    return Math.floor((longitude+180)*width/360 + 0.5); // <- round
	}, latToX = function (latitude) {
	    return Math.floor((-latitude+90)*height/180 + 0.5); // <- round
	}, eventQueue = [], pub = {
	    reRender: function() {
		var now = new Date(), event, length = eventQueue.length, i, x, y;
		for(i = 0; i < length; i += 1) {
		    event = eventQueue.shift();
		    event(now); 
		}
		for(x = 0; x < width; x += 1) {
		    for(y = 0; y < height; y += 1) {
			if(grid[x][y].dirty) {
			    render(x,y);
			}
		    }
		}
	    },
	    events: {
		changeColor: function (x, y, start, target, length, onComplete) {
		    var startTime = new Date().getTime(),
	            updater = function(now) {
			var diff = now.getTime() - startTime;
			if(diff < length) {
			    setColor(x,y, new Color(start.rgbString()).mix(target, diff/length));
			    eventQueue.push(updater);
			} else {
			    onComplete();
			}
		    };
		    return updater;
		}, changeRadius: function (x, y, start, target, length, onComplete) {
		    var startTime = new Date().getTime(),
			updater = function(now) {
			    var diff = now.getTime() - startTime;
			    if(diff < length) {
				setRadius(x,y, (target-start)*(diff/length) + start);
				eventQueue.push(updater);
			    } else {
				onComplete();
			    }
			};
		    return updater;
		}
	    },
	    newEvent: function(longitude, latitude, type) {
		var x = longToX(longitude), y = latToX(latitude),
		    dot, startColor, targetColor, startRadius, targetRadius;
		if(x >= 0 && y >= 0 && x < width && y < height) {
		    dot = grid[x][y];
		    startColor = new Color(dot.initial.color.rgbString());
		    targetColor = new Color("#ff8800");
		    startRadius = dot.initial.radius;
		    targetRadius = dotRadius;
		    
		    eventQueue.push(pub.events.changeColor(x, y, startColor, targetColor, 1024, function () {
			eventQueue.push(pub.events.changeColor(x, y, targetColor, startColor, 1024, function () {}));
		    }));
		    eventQueue.push(pub.events.changeRadius(x, y, startRadius, targetRadius, 1024, function () {
			eventQueue.push(pub.events.changeRadius(x, y, targetRadius, startRadius, 1024, function () {}));
		    }));
		}
	    }
	};
      
      return pub;
};
