var Fireworks = function () {
    /*=============================================================================*/
	/* Utility
	/*=============================================================================*/
    var self = this;
    var isInit = false;
    var rand = function (rMi, rMa) { return ~~((Math.random() * (rMa - rMi + 1)) + rMi); }
    var hitTest = function (x1, y1, w1, h1, x2, y2, w2, h2) { return !(x1 + w1 < x2 || x2 + w2 < x1 || y1 + h1 < y2 || y2 + h2 < y1); };
    window.requestAnimFrame = function () { return function (a) { window.setTimeout(a, 1E3 / 60) } }();

    /*=============================================================================*/
	/* Initialize
	/*=============================================================================*/
    self.init = function () {
        if (isInit) {
            return;
        }

        isInit = true;
        self.dt = 0;
        self.oldTime = Date.now();
        self.canvas = document.createElement('canvas');
        self.canvasContainer = $('#canvas-container');

        var canvasContainerDisabled = document.getElementById('canvas-container');
        self.canvas.onselectstart = function () {
            return false;
        };

        self.canvas.width = self.cw = window.innerWidth;
        self.canvas.height = self.ch = window.innerHeight;

        self.particles = [];
        self.partCount = 20;
        self.fireworks = [];
        self.mx = self.cw / 2;
        self.my = self.ch / 2;
        self.currentHue = 300;
        self.partSpeed = 5;
        self.partSpeedVariance = 10;
        self.partWind = 50;
        self.partFriction = 20;
        self.partGravity = 1;
        self.hueMin = 150;
        self.hueMax = 200;
        self.fworkSpeed = 2;
        self.fworkAccel = 4;
        self.hueVariance = 30;
        self.flickerDensity = 20;
        self.showShockwave = false;
        self.showTarget = false;
        self.clearAlpha = 25;

        self.canvasContainer.append(self.canvas);
        self.ctx = self.canvas.getContext('2d');
        self.ctx.lineCap = 'round';
        self.ctx.lineJoin = 'round';
        self.lineWidth = 1;
        self.bindEvents();
        self.canvasLoop();

        self.canvas.onselectstart = function () {
            return false;
        };


    };

    /*=============================================================================*/
	/* Particle Constructor
	/*=============================================================================*/
    var Particle = function (x, y, hue, gravity, friction, lineWidth) {
        this.x = x;
        this.y = y;
        this.coordLast = [
            { x: x, y: y },
            { x: x, y: y },
            { x: x, y: y }
        ];
        this.angle = rand(0, 360);
        this.speed = rand(((self.partSpeed - self.partSpeedVariance) <= 0) ? 1 : self.partSpeed - self.partSpeedVariance, (self.partSpeed + self.partSpeedVariance));
        this.friction = 1 - friction / 100;
        this.gravity = gravity / 2;
        this.hue = rand(hue - self.hueVariance, hue + self.hueVariance);
        this.brightness = rand(50, 80);
        this.alpha = rand(40, 100) / 100;
        this.decay = rand(10, 50) / 1000;
        this.wind = (rand(0, lineWidth) - (lineWidth / 2)) / 25;
        this.lineWidth = lineWidth;
    };

    Particle.prototype.update = function (index) {
        var radians = this.angle * Math.PI / 180;
        var vx = Math.cos(radians) * this.speed;
        var vy = Math.sin(radians) * this.speed + this.gravity;
        this.speed *= this.friction;

        this.coordLast[2].x = this.coordLast[1].x;
        this.coordLast[2].y = this.coordLast[1].y;
        this.coordLast[1].x = this.coordLast[0].x;
        this.coordLast[1].y = this.coordLast[0].y;
        this.coordLast[0].x = this.x;
        this.coordLast[0].y = this.y;

        this.x += vx * self.dt;
        this.y += vy * self.dt;

        this.angle += this.wind;
        this.alpha -= this.decay;

        if (!hitTest(0, 0, self.cw, self.ch, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2) || this.alpha < .05) {
            self.particles.splice(index, 1);
        }
    };

    Particle.prototype.draw = function () {
        var coordRand = (rand(1, 3) - 1);
        self.ctx.beginPath();
        self.ctx.moveTo(Math.round(this.coordLast[coordRand].x), Math.round(this.coordLast[coordRand].y));
        self.ctx.lineTo(Math.round(this.x), Math.round(this.y));
        self.ctx.closePath();
        self.ctx.strokeStyle = 'hsla(' + this.hue + ', 100%, ' + this.brightness + '%, ' + this.alpha + ')';
        self.ctx.stroke();

        if (self.flickerDensity > 0) {
            var inverseDensity = 50 - self.flickerDensity;
            if (rand(0, inverseDensity) === inverseDensity) {
                self.ctx.beginPath();
                self.ctx.arc(Math.round(this.x), Math.round(this.y), rand(this.lineWidth, this.lineWidth + 3) / 2, 0, Math.PI * 2, false)
                self.ctx.closePath();
                var randAlpha = rand(50, 100) / 100;
                self.ctx.fillStyle = 'hsla(' + this.hue + ', 100%, ' + this.brightness + '%, ' + randAlpha + ')';
                self.ctx.fill();
            }
        }
    };

    /*=============================================================================*/
	/* Create Particles
	/*=============================================================================*/
    self.createParticles = function (x, y, hue, gravity, friction, lineWidth) {
        var countdown = self.partCount;
        while (countdown--) {
            self.particles.push(new Particle(x, y, hue, gravity, friction, lineWidth));
        }
    };

    /*=============================================================================*/
	/* Update Particles
	/*=============================================================================*/
    self.updateParticles = function () {
        var i = self.particles.length;
        while (i--) {
            var p = self.particles[i];
            p.update(i);
        };
    };

    /*=============================================================================*/
	/* Draw Particles
	/*=============================================================================*/
    self.drawParticles = function () {
        var i = self.particles.length;
        while (i--) {
            var p = self.particles[i];
            p.draw();
        };
    };

    /*=============================================================================*/
	/* Firework Constructor
	/*=============================================================================*/
    var Firework = function (startX, startY, targetX, targetY, hueColor, gravity, friction, lineWidth) {
        this.x = startX;
        this.y = startY;
        this.startX = startX;
        this.startY = startY;
        this.hitX = false;
        this.hitY = false;
        this.coordLast = [
            { x: startX, y: startY },
            { x: startX, y: startY },
            { x: startX, y: startY }
        ];
        this.targetX = targetX;
        this.targetY = targetY;
        this.speed = self.fworkSpeed;
        this.angle = Math.atan2(targetY - startY, targetX - startX);
        this.shockwaveAngle = Math.atan2(targetY - startY, targetX - startX) + (90 * (Math.PI / 180));
        this.acceleration = self.fworkAccel / 100;
        this.hue = hueColor;
        this.brightness = rand(50, 80);
        this.alpha = rand(50, 100) / 100;
        this.lineWidth = self.lineWidth;
        this.targetRadius = 1;
        this.gravity = gravity;
        this.friction = friction;
        this.lineWidth = lineWidth;
    };

    Firework.prototype.update = function (index) {
        self.ctx.lineWidth = this.lineWidth;

        vx = Math.cos(this.angle) * this.speed,
            vy = Math.sin(this.angle) * this.speed;
        this.speed *= 1 + this.acceleration;
        this.coordLast[2].x = this.coordLast[1].x;
        this.coordLast[2].y = this.coordLast[1].y;
        this.coordLast[1].x = this.coordLast[0].x;
        this.coordLast[1].y = this.coordLast[0].y;
        this.coordLast[0].x = this.x;
        this.coordLast[0].y = this.y;

        if (self.showTarget) {
            if (this.targetRadius < 8) {
                this.targetRadius += .25 * self.dt;
            } else {
                this.targetRadius = 1 * self.dt;
            }
        }

        if (this.startX >= this.targetX) {
            if (this.x + vx <= this.targetX) {
                this.x = this.targetX;
                this.hitX = true;
            } else {
                this.x += vx * self.dt;
            }
        } else {
            if (this.x + vx >= this.targetX) {
                this.x = this.targetX;
                this.hitX = true;
            } else {
                this.x += vx * self.dt;
            }
        }

        if (this.startY >= this.targetY) {
            if (this.y + vy <= this.targetY) {
                this.y = this.targetY;
                this.hitY = true;
            } else {
                this.y += vy * self.dt;
            }
        } else {
            if (this.y + vy >= this.targetY) {
                this.y = this.targetY;
                this.hitY = true;
            } else {
                this.y += vy * self.dt;
            }
        }

        if (this.hitX && this.hitY) {
            var randExplosion = rand(0, 9);
            self.createParticles(this.targetX, this.targetY, this.hue, this.gravity, this.friction, this.lineWidth);
            self.fireworks.splice(index, 1);
        }
    };

    Firework.prototype.draw = function () {
        self.ctx.lineWidth = this.lineWidth;

        var coordRand = (rand(1, 3) - 1);
        self.ctx.beginPath();
        self.ctx.moveTo(Math.round(this.coordLast[coordRand].x), Math.round(this.coordLast[coordRand].y));
        self.ctx.lineTo(Math.round(this.x), Math.round(this.y));
        self.ctx.closePath();
        self.ctx.strokeStyle = 'hsla(' + this.hue + ', 100%, ' + this.brightness + '%, ' + this.alpha + ')';
        self.ctx.stroke();

        if (self.showTarget) {
            self.ctx.save();
            self.ctx.beginPath();
            self.ctx.arc(Math.round(this.targetX), Math.round(this.targetY), this.targetRadius, 0, Math.PI * 2, false)
            self.ctx.closePath();
            self.ctx.lineWidth = 1;
            self.ctx.stroke();
            self.ctx.restore();
        }

        if (self.showShockwave) {
            self.ctx.save();
            self.ctx.translate(Math.round(this.x), Math.round(this.y));
            self.ctx.rotate(this.shockwaveAngle);
            self.ctx.beginPath();
            self.ctx.arc(0, 0, 1 * (this.speed / 5), 0, Math.PI, true);
            self.ctx.strokeStyle = 'hsla(' + this.hue + ', 100%, ' + this.brightness + '%, ' + rand(25, 60) / 100 + ')';
            self.ctx.lineWidth = this.lineWidth;
            self.ctx.stroke();
            self.ctx.restore();
        }
    };

    /*=============================================================================*/
	/* Create Fireworks
	/*=============================================================================*/
    self.createFireworks = function (startX, startY, targetX, targetY, hue) {
        self.fireworks.push(new Firework(startX, startY, targetX, targetY, hue));
    };

    /*=============================================================================*/
	/* Update Fireworks
	/*=============================================================================*/
    self.updateFireworks = function () {
        var i = self.fireworks.length;
        while (i--) {
            var f = self.fireworks[i];
            f.update(i);
        };
    };

    /*=============================================================================*/
	/* Draw Fireworks
	/*=============================================================================*/
    self.drawFireworks = function () {
        var i = self.fireworks.length;
        while (i--) {
            var f = self.fireworks[i];
            f.draw();
        };
    };

    /*=============================================================================*/
	/* Events
	/*=============================================================================*/
    self.bindEvents = function () {
        $(window).on('resize', function () {
            clearTimeout(self.timeout);
            self.timeout = setTimeout(function () {
                self.ctx.lineCap = 'round';
                self.ctx.lineJoin = 'round';
            }, 100);
        });

        /*$(self.canvas).on('mousedown', function (e) {
            var randLaunch = rand(0, 5);
            self.mx = e.pageX - self.canvasContainer.offset().left;
            self.my = e.pageY - self.canvasContainer.offset().top;
            self.currentHue = rand(self.hueMin, self.hueMax);
            self.createFireworks(self.cw / 2, self.ch, self.mx, self.my);

            $(self.canvas).on('mousemove.fireworks', function (e) {
                var randLaunch = rand(0, 5);
                self.mx = e.pageX - self.canvasContainer.offset().left;
                self.my = e.pageY - self.canvasContainer.offset().top;
                self.currentHue = rand(self.hueMin, self.hueMax);
                self.createFireworks(self.cw / 2, self.ch, self.mx, self.my);
            });

        });

        $(self.canvas).on('mouseup', function (e) {
            $(self.canvas).off('mousemove.fireworks');
        }); */

    }

    /*=============================================================================*/
	/* Clear Canvas
	/*=============================================================================*/
    self.clear = function () {
        self.particles = [];
        self.fireworks = [];
        self.ctx.clearRect(0, 0, self.cw, self.ch);
    };

    /*=============================================================================*/
	/* Delta
	/*=============================================================================*/
    self.updateDelta = function () {
        var newTime = Date.now();
        self.dt = (newTime - self.oldTime) / 16;
        self.dt = (self.dt > 5) ? 5 : self.dt;
        self.oldTime = newTime;
    }

    /*=============================================================================*/
	/* Main Loop
	/*=============================================================================*/
    self.canvasLoop = function () {
        requestAnimFrame(self.canvasLoop, self.canvas);
        self.updateDelta();
        self.ctx.globalCompositeOperation = 'destination-out';
        self.ctx.fillStyle = 'rgba(0,0,0,' + self.clearAlpha / 100 + ')';
        self.ctx.fillRect(0, 0, self.cw, self.ch);
        self.ctx.globalCompositeOperation = 'lighter';
        self.updateFireworks();
        self.updateParticles();
        self.drawFireworks();
        self.drawParticles();
    };

    self.start = function(count, hue, xStart) {
        if (self.fireworks && self.fireworks.length >= 500) {
            return;
        }
        
        if (self.fireworks && self.fireworks.length + count > 500)
            count = Math.round((count - self.fireworks.length));
        
        self.init();

        var startX = 0;
        var targetX = 0;
        var gravity = 1;
        var friction = 20;
        var lineWidth = 1;

        if (xStart == 'right') {
            startX = self.cw / 1.17;
            targetX = startX - 150;
            gravity = 8;
        }
        else if (xStart == 'middle') {
            startX = self.cw / 2;
            targetX = startX;
            lineWidth = 6;
        }
        else if (xStart == 'left') {
            startX = 200;
            targetX = startX + 150;
            friction = 5;
        }
        
        while (count--) {
            setTimeout(function () {
                self.fireworks.push(new Firework(startX + (Math.floor(Math.random() * 100) + 1), self.ch, targetX + rand(-100, 100), (self.ch / 5) + rand(-130, 130), hue, gravity, friction, lineWidth));
            }, count * 100);
        }
    }
}

/*=============================================================================*/
/* GUI
/*=============================================================================*/
var guiPresets = {
    "preset": "Default",
    "remembered": {
        "Default": {
            "0": {
                "fworkSpeed": 2,
                "fworkAccel": 4,
                "showShockwave": false,
                "showTarget": true,
                "partCount": 30,
                "partSpeed": 5,
                "partSpeedVariance": 10,
                "partWind": 50,
                "partFriction": 5,
                "partGravity": 1,
                "flickerDensity": 20,
                "hueMin": 150,
                "hueMax": 200,
                "hueVariance": 30,
                "lineWidth": 1,
                "clearAlpha": 25
            }
        },
        "Anti Gravity": {
            "0": {
                "fworkSpeed": 4,
                "fworkAccel": 10,
                "showShockwave": true,
                "showTarget": false,
                "partCount": 150,
                "partSpeed": 5,
                "partSpeedVariance": 10,
                "partWind": 10,
                "partFriction": 10,
                "partGravity": -10,
                "flickerDensity": 30,
                "hueMin": 0,
                "hueMax": 360,
                "hueVariance": 30,
                "lineWidth": 1,
                "clearAlpha": 50
            }
        },
        "Battle Field": {
            "0": {
                "fworkSpeed": 10,
                "fworkAccel": 20,
                "showShockwave": true,
                "showTarget": true,
                "partCount": 200,
                "partSpeed": 30,
                "partSpeedVariance": 5,
                "partWind": 0,
                "partFriction": 5,
                "partGravity": 0,
                "flickerDensity": 0,
                "hueMin": 20,
                "hueMax": 30,
                "hueVariance": 10,
                "lineWidth": 1,
                "clearAlpha": 40
            }
        },
        "Mega Blast": {
            "0": {
                "fworkSpeed": 3,
                "fworkAccel": 3,
                "showShockwave": true,
                "showTarget": true,
                "partCount": 500,
                "partSpeed": 50,
                "partSpeedVariance": 5,
                "partWind": 0,
                "partFriction": 0,
                "partGravity": 0,
                "flickerDensity": 0,
                "hueMin": 0,
                "hueMax": 360,
                "hueVariance": 30,
                "lineWidth": 20,
                "clearAlpha": 20
            }
        },
        "Nimble": {
            "0": {
                "fworkSpeed": 10,
                "fworkAccel": 50,
                "showShockwave": false,
                "showTarget": false,
                "partCount": 120,
                "partSpeed": 10,
                "partSpeedVariance": 10,
                "partWind": 100,
                "partFriction": 50,
                "partGravity": 0,
                "flickerDensity": 20,
                "hueMin": 0,
                "hueMax": 360,
                "hueVariance": 30,
                "lineWidth": 1,
                "clearAlpha": 80
            }
        },
        "Slow Launch": {
            "0": {
                "fworkSpeed": 2,
                "fworkAccel": 2,
                "showShockwave": false,
                "showTarget": false,
                "partCount": 200,
                "partSpeed": 10,
                "partSpeedVariance": 0,
                "partWind": 100,
                "partFriction": 0,
                "partGravity": 2,
                "flickerDensity": 50,
                "hueMin": 0,
                "hueMax": 360,
                "hueVariance": 20,
                "lineWidth": 4,
                "clearAlpha": 10
            }
        },
        "Perma Trail": {
            "0": {
                "fworkSpeed": 4,
                "fworkAccel": 10,
                "showShockwave": false,
                "showTarget": false,
                "partCount": 150,
                "partSpeed": 10,
                "partSpeedVariance": 10,
                "partWind": 100,
                "partFriction": 3,
                "partGravity": 0,
                "flickerDensity": 0,
                "hueMin": 0,
                "hueMax": 360,
                "hueVariance": 20,
                "lineWidth": 1,
                "clearAlpha": 0
            }
        }
    },
    "closed": true,
    "folders": {
        "Fireworks": {
            "preset": "Default",
            "closed": false,
            "folders": {}
        },
        "Particles": {
            "preset": "Default",
            "closed": true,
            "folders": {}
        },
        "Color": {
            "preset": "Default",
            "closed": true,
            "folders": {}
        },
        "Other": {
            "preset": "Default",
            "closed": true,
            "folders": {}
        }
    }
};