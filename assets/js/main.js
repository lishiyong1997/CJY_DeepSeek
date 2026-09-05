/* ==========================================================================
   国家国防科技工业软件产教研平台 · 全站交互引擎
   包含：导航交互 / 数字滚动 / 滚动渐显 / 3D 粒子背景 / 驾驶舱图表 / 登录表单
   ========================================================================== */
(function () {
  'use strict';

  /* ----------------------------------------------------------------------
   * 0. 工具
   * -------------------------------------------------------------------- */
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var on = function (el, ev, fn) { if (el) el.addEventListener(ev, fn); };
  var dpr = function () { return Math.min(window.devicePixelRatio || 1, 2); };

  /* 数字格式化（千分位） */
  function fmt(n) { return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  /* ----------------------------------------------------------------------
   * 1. 顶部导航
   * -------------------------------------------------------------------- */
  function initNav() {
    var header = $('.site-header');
    if (!header) return;

    // 滚动阴影
    var onScroll = function () {
      if (window.scrollY > 8) header.classList.add('is-scrolled');
      else header.classList.remove('is-scrolled');
    };
    onScroll();
    on(window, 'scroll', onScroll, { passive: true });

    // 移动端汉堡
    var toggle = $('.nav-toggle');
    var nav = $('.main-nav');
    if (toggle && nav) {
      on(toggle, 'click', function () {
        document.body.classList.toggle('nav-open');
        toggle.classList.toggle('is-open');
        nav.classList.toggle('mobile-open');
        if (nav.classList.contains('mobile-open')) {
          nav.style.display = 'flex';
          nav.style.flexDirection = 'column';
          nav.style.position = 'absolute';
          nav.style.top = '96px';
          nav.style.left = '0';
          nav.style.right = '0';
          nav.style.background = 'linear-gradient(180deg, #0a2746, #0e345a)';
          nav.style.padding = '12px 0';
          nav.style.boxShadow = '0 24px 40px rgba(3,12,24,0.5)';
        } else {
          nav.style.display = '';
          nav.style.flexDirection = '';
          nav.style.position = '';
          nav.style.top = '';
          nav.style.left = '';
          nav.style.right = '';
          nav.style.background = '';
          nav.style.padding = '';
          nav.style.boxShadow = '';
        }
      });
    }
  }

  /* ----------------------------------------------------------------------
   * 2. 数字滚动动画
   * -------------------------------------------------------------------- */
  function animateNumber(el, target, opts) {
    opts = opts || {};
    var duration = opts.duration || 1600;
    var start = null;
    var decimals = opts.decimals || 0;
    var from = opts.from || 0;
    var grouping = opts.grouping !== false;

    function render(v) { return grouping ? fmt(v) : String(v); }
    function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

    function step(ts) {
      if (!start) start = ts;
      var p = clamp((ts - start) / duration, 0, 1);
      var v = lerp(from, target, easeOutExpo(p));
      el.textContent = render(Math.round(v * Math.pow(10, decimals)) / Math.pow(10, decimals));
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = render(target);
    }
    requestAnimationFrame(step);
  }

  function initStatCounters() {
    var cards = $$('.stat-card__num[data-value]');
    if (!cards.length) return;

    var triggered = false;
    var run = function () {
      cards.forEach(function (el) {
        var val = parseFloat(el.getAttribute('data-value'));
        var unit = el.getAttribute('data-unit') || '';
        var main = document.createElement('span');
        main.className = 'num';
        el.appendChild(main);
        if (unit) {
          var u = document.createElement('span');
          u.className = 'unit';
          u.textContent = unit;
          el.appendChild(u);
        }
        // 数字位数越长，字号自适应缩小，保证在窄卡片内完整显示
        var chars = Math.round(val).toString().length;
        var fs = chars >= 5 ? 22 : (chars >= 4 ? 28 : (chars >= 3 ? 36 : 42));
        main.style.fontSize = fs + 'px';
        animateNumber(main, val, { duration: 1600 + Math.random() * 500, grouping: false });
      });
    };

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !triggered) { triggered = true; run(); io.disconnect(); }
        });
      }, { threshold: 0.3 });
      cards.forEach(function (c) { io.observe(c); });
    } else {
      run();
    }
  }

  /* ----------------------------------------------------------------------
   * 3. 滚动渐显
   * -------------------------------------------------------------------- */
  function initReveal() {
    var els = $$('.reveal');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------------------
   * 3b. 右侧隐藏式锚点导航（scrollspy + 平滑滚动）
   * -------------------------------------------------------------------- */
  function initSideNav() {
    var nav = $('.side-nav');
    if (!nav) return;
    var items = $$('.side-nav__item', nav);
    var sections = items.map(function (it) {
      var id = it.getAttribute('href').slice(1);
      return id === 'top' ? null : document.getElementById(id);
    });

    var current = '';
    function onScroll() {
      var pos = window.scrollY + 140;
      var idx = 0;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i] && sections[i].offsetTop <= pos) idx = i + 1;
      }
      var activeId = idx === 0 ? 'top' : sections[idx - 1].id;
      if (activeId !== current) {
        current = activeId;
        items.forEach(function (it) {
          it.classList.toggle('is-active', it.getAttribute('href').slice(1) === activeId);
        });
      }
    }
    onScroll();
    on(window, 'scroll', onScroll, { passive: true });

    items.forEach(function (it) {
      on(it, 'click', function (e) {
        e.preventDefault();
        var id = it.getAttribute('href').slice(1);
        if (id === 'top') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
        var el = document.getElementById(id);
        if (el) {
          var y = el.getBoundingClientRect().top + window.scrollY - 74;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      });
    });
  }

  /* ----------------------------------------------------------------------
   * 4. 三维粒子背景引擎（hero / 登录页 / 驾驶舱通用）
   * -------------------------------------------------------------------- */
  function ParticleField(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.count = opts.count || 90;
    this.color = opts.color || 'rgba(120,190,240,ALPHA)';
    this.linkDist = opts.linkDist || 120;
    this.speed = opts.speed || 0.0004;
    this.radius = opts.radius || 360;
    this.mouse = { x: 0, y: 0, active: false };
    this.particles = [];
    this.geo = opts.geo !== false; // 浮动线框几何体
    this._resize();
    this._init();
    this._bind();
  }

  ParticleField.prototype._resize = function () {
    var r = dpr();
    var w = this.canvas.clientWidth || this.canvas.parentNode.clientWidth || window.innerWidth;
    var h = this.canvas.clientHeight || this.canvas.parentNode.clientHeight || window.innerHeight;
    this.w = w; this.h = h;
    this.canvas.width = w * r;
    this.canvas.height = h * r;
    this.ctx.setTransform(r, 0, 0, r, 0, 0);
  };

  ParticleField.prototype._init = function () {
    this.particles = [];
    for (var i = 0; i < this.count; i++) {
      this.particles.push({
        x: (Math.random() - 0.5) * this.w * 1.4,
        y: (Math.random() - 0.5) * this.h * 1.4,
        z: (Math.random() - 0.5) * this.radius * 2,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2
      });
    }
  };

  ParticleField.prototype._bind = function () {
    var self = this;
    on(window, 'resize', function () { self._resize(); });
    on(this.canvas, 'mousemove', function (e) {
      var rect = self.canvas.getBoundingClientRect();
      self.mouse.x = e.clientX - rect.left;
      self.mouse.y = e.clientY - rect.top;
      self.mouse.active = true;
    });
    on(this.canvas, 'mouseleave', function () { self.mouse.active = false; });
  };

  ParticleField.prototype._project = function (p, angle) {
    var cos = Math.cos(angle), sin = Math.sin(angle);
    var x = p.x * cos - p.z * sin;
    var z = p.x * sin + p.z * cos;
    var scale = 400 / (400 - z);
    return {
      sx: this.w / 2 + x * scale,
      sy: this.h / 2 + p.y * scale,
      scale: scale,
      depth: z
    };
  };

  ParticleField.prototype._drawWire = function (angle) {
    // 浮动线框正多面体
    var cx = this.w * 0.82, cy = this.h * 0.30, R = 60;
    var shapes = [
      { verts: [[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]], edges: [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]] }, // 正四面体
      { verts: [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]], edges: [[0,2],[0,3],[0,4],[0,5],[1,2],[1,3],[1,4],[1,5],[2,4],[2,5],[3,4],[3,5]] } // 正八面体
    ];
    var self = this;
    shapes.forEach(function (shape, si) {
      var ox = si === 0 ? cx : this.w * 0.15;
      var oy = si === 0 ? cy : this.h * 0.72;
      var rr = si === 0 ? R : R * 0.8;
      var a = angle * (si === 0 ? 1 : -1.3);
      var proj = shape.verts.map(function (v) {
        var x = v[0], y = v[1], z = v[2];
        var c1 = Math.cos(a), s1 = Math.sin(a);
        var x2 = x * c1 - z * s1, z2 = x * s1 + z * c1;
        var c2 = Math.cos(a * 0.6), s2 = Math.sin(a * 0.6);
        var y2 = y * c2 - z2 * s2;
        var s = 1.15;
        return [ox + x2 * rr * s, oy + y2 * rr * s, z2];
      });
      self.ctx.save();
      self.ctx.strokeStyle = 'rgba(120,190,240,0.28)';
      self.ctx.lineWidth = 1;
      self.ctx.beginPath();
      shape.edges.forEach(function (e) {
        var a1 = proj[e[0]], a2 = proj[e[1]];
        self.ctx.moveTo(a1[0], a1[1]);
        self.ctx.lineTo(a2[0], a2[1]);
      });
      self.ctx.stroke();
      // 顶点光点
      proj.forEach(function (p) {
        self.ctx.fillStyle = 'rgba(180,220,250,0.6)';
        self.ctx.beginPath();
        self.ctx.arc(p[0], p[1], 1.6, 0, Math.PI * 2);
        self.ctx.fill();
      });
      self.ctx.restore();
    }, this);
  };

  ParticleField.prototype._tick = function () {
    var self = this;
    this.angle = (this.angle || 0) + this.speed;
    var ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);

    // 鼠标视差偏移
    var mx = this.mouse.active ? (this.mouse.x - this.w / 2) * 0.02 : 0;
    var my = this.mouse.active ? (this.mouse.y - this.h / 2) * 0.02 : 0;

    var pts = this.particles.map(function (p) {
      p.x += p.vx; p.y += p.vy;
      if (p.x > self.w / 2 + 300) p.x = -self.w / 2 - 300;
      if (p.x < -self.w / 2 - 300) p.x = self.w / 2 + 300;
      if (p.y > self.h / 2 + 300) p.y = -self.h / 2 - 300;
      if (p.y < -self.h / 2 - 300) p.y = self.h / 2 + 300;
      return self._project(p, self.angle);
    });

    // 连线
    var i, j;
    for (i = 0; i < pts.length; i++) {
      for (j = i + 1; j < pts.length; j++) {
        var dx = pts[i].sx - pts[j].sx, dy = pts[i].sy - pts[j].sy;
        var d2 = dx * dx + dy * dy;
        if (d2 < this.linkDist * this.linkDist) {
          var alpha = (1 - Math.sqrt(d2) / this.linkDist) * 0.22;
          ctx.strokeStyle = this.color.replace('ALPHA', alpha.toFixed(3));
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(pts[i].sx, pts[i].sy);
          ctx.lineTo(pts[j].sx, pts[j].sy);
          ctx.stroke();
        }
      }
    }

    // 粒子
    pts.forEach(function (p) {
      var size = clamp(p.scale * 1.4, 0.6, 2.6);
      var alpha = clamp(p.scale * 0.6, 0.12, 0.85);
      ctx.fillStyle = self.color.replace('ALPHA', alpha.toFixed(3));
      ctx.beginPath();
      ctx.arc(p.sx + mx, p.sy + my, size, 0, Math.PI * 2);
      ctx.fill();
    });

    if (this.geo) this._drawWire(this.angle * 0.4);
  };

  ParticleField.prototype.start = function () {
    var self = this;
    (function loop() {
      self._tick();
      self._raf = requestAnimationFrame(loop);
    })();
  };
  ParticleField.prototype.stop = function () { cancelAnimationFrame(this._raf); };

  function initHeroParticles() {
    var c = $('#heroCanvas');
    if (!c) return;
    var ctx = c.getContext('2d');
    var r = dpr();
    var W = 0, H = 0;
    function resize() {
      W = c.clientWidth; H = c.clientHeight;
      c.width = W * r; c.height = H * r;
      ctx.setTransform(r, 0, 0, r, 0, 0);
    }
    resize();
    on(window, 'resize', resize);

    var mouse = { x: 0, y: 0, active: false };
    on(c, 'mousemove', function (e) {
      var rect = c.getBoundingClientRect();
      mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top; mouse.active = true;
    });
    on(c, 'mouseleave', function () { mouse.active = false; });

    /* 粒子网络 */
    var parts = [];
    for (var i = 0; i < 66; i++) {
      parts.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
        r: 0.8 + Math.random() * 1.6
      });
    }

    /* 流水线零件 */
    var goods = [];
    for (var j = 0; j < 6; j++) goods.push({ off: j / 6 });

    function gear(cx, cy, R, teeth, rot, color) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
      ctx.strokeStyle = color; ctx.lineWidth = 1.2;
      for (var k = 0; k < teeth; k++) {
        var a = k / teeth * Math.PI * 2;
        ctx.save(); ctx.rotate(a);
        ctx.beginPath(); ctx.rect(R - 2, -5, 10, 10); ctx.stroke();
        ctx.restore();
      }
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, R * 0.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, R * 0.13, 0, Math.PI * 2); ctx.stroke();
      for (var m = 0; m < 5; m++) {
        var b = m / 5 * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(b) * R * 0.16, Math.sin(b) * R * 0.16);
        ctx.lineTo(Math.cos(b) * R * 0.92, Math.sin(b) * R * 0.92);
        ctx.stroke();
      }
      ctx.restore();
    }

    function conveyor(base, t) {
      var x0 = W * 0.12, x1 = W * 0.62, y = base;
      ctx.strokeStyle = 'rgba(150,205,245,0.28)'; ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x0, y); ctx.lineTo(x1, y);
      ctx.moveTo(x0, y + 18); ctx.lineTo(x1, y + 18);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(x0, y + 9, 9, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x1, y + 9, 9, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(120,190,240,0.5)';
      goods.forEach(function (g) {
        var p = (t * 0.12 + g.off) % 1;
        var px = x0 + 22 + p * (x1 - x0 - 44);
        ctx.fillRect(px, y + 3, 10, 12);
      });
    }

    function arm(cx, cy, t) {
      ctx.save(); ctx.translate(cx, cy);
      var a1 = Math.sin(t * 0.55) * 0.4 - 0.35;
      var a2 = Math.cos(t * 0.5) * 0.5;
      ctx.strokeStyle = 'rgba(150,205,245,0.32)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke();
      var x1 = Math.cos(a1) * 46, y1 = Math.sin(a1) * 46;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x1, y1); ctx.stroke();
      var x2 = x1 + Math.cos(a1 + a2) * 34, y2 = y1 + Math.sin(a1 + a2) * 34;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.fillStyle = 'rgba(150,205,245,0.6)';
      ctx.beginPath(); ctx.arc(x1, y1, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x2, y2, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function chip(cx, cy, t) {
      ctx.save(); ctx.translate(cx, cy);
      var s = 26;
      ctx.strokeStyle = 'rgba(150,205,245,0.3)'; ctx.lineWidth = 1.2;
      ctx.strokeRect(-s, -s, s * 2, s * 2);
      ctx.strokeRect(-s * 0.42, -s * 0.42, s * 0.84, s * 0.84);
      for (var k = 0; k < 4; k++) {
        var off = -s + (k + 1) * (2 * s / 5);
        ctx.beginPath(); ctx.moveTo(off, -s); ctx.lineTo(off, -s - 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(off, s); ctx.lineTo(off, s + 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-s, off); ctx.lineTo(-s - 8, off); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s, off); ctx.lineTo(s + 8, off); ctx.stroke();
      }
      var pulse = (t * 0.5) % 1;
      var px = -s + pulse * 2 * s;
      ctx.fillStyle = 'rgba(180,220,250,0.8)';
      ctx.beginPath(); ctx.arc(px, -s * 0.42, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    var angle = 0;
    (function loop() {
      var t = performance.now() / 1000;
      angle += 0.004;
      ctx.clearRect(0, 0, W, H);

      var mx = mouse.active ? (mouse.x - W / 2) * 0.02 : 0;
      var my = mouse.active ? (mouse.y - H / 2) * 0.02 : 0;

      /* 粒子连线 */
      parts.forEach(function (p) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      });
      for (var i = 0; i < parts.length; i++) {
        for (var j2 = i + 1; j2 < parts.length; j2++) {
          var dx = parts[i].x - parts[j2].x, dy = parts[i].y - parts[j2].y;
          var d2 = dx * dx + dy * dy;
          if (d2 < 130 * 130) {
            var alpha = (1 - Math.sqrt(d2) / 130) * 0.16;
            ctx.strokeStyle = 'rgba(150,205,245,' + alpha.toFixed(3) + ')';
            ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(parts[i].x, parts[i].y); ctx.lineTo(parts[j2].x, parts[j2].y); ctx.stroke();
          }
        }
      }
      parts.forEach(function (p) {
        ctx.fillStyle = 'rgba(150,205,245,0.5)';
        ctx.beginPath(); ctx.arc(p.x + mx, p.y + my, p.r, 0, Math.PI * 2); ctx.fill();
      });

      /* 工业元素：齿轮 / 流水线 / 机械臂 / 芯片 */
      gear(W * 0.07, H * 0.8, 52, 10, angle, 'rgba(150,205,245,0.24)');
      gear(W * 0.94, H * 0.22, 38, 8, -angle * 1.35, 'rgba(150,205,245,0.18)');
      conveyor(H - 52, t);
      arm(W * 0.86, H * 0.58, t);
      chip(W * 0.13, H * 0.28, t);

      requestAnimationFrame(loop);
    })();
  }

  /* 登录页 · 工业数据流 */
  function initAuthFlow() {
    var c = $('#authFlow');
    if (!c) return;
    var ctx = c.getContext('2d');
    var r = dpr();
    var W = 0, H = 0;
    function resize() {
      W = c.clientWidth; H = c.clientHeight;
      c.width = W * r; c.height = H * r;
      ctx.setTransform(r, 0, 0, r, 0, 0);
    }
    resize();
    on(window, 'resize', resize);

    var streams = [];
    for (var i = 0; i < 40; i++) {
      streams.push({
        x: Math.random() * W,
        y: Math.random() * H,
        len: 30 + Math.random() * 80,
        sp: 0.4 + Math.random() * 1.2,
        alpha: 0.05 + Math.random() * 0.25
      });
    }
    (function loop() {
      ctx.clearRect(0, 0, W, H);
      streams.forEach(function (s) {
        s.y -= s.sp;
        if (s.y < -s.len) { s.y = H + s.len; s.x = Math.random() * W; }
        var g = ctx.createLinearGradient(s.x, s.y, s.x, s.y + s.len);
        g.addColorStop(0, 'rgba(77,179,240,' + s.alpha + ')');
        g.addColorStop(1, 'rgba(77,179,240,0)');
        ctx.fillStyle = g;
        ctx.fillRect(s.x, s.y, 1, s.len);
      });
      requestAnimationFrame(loop);
    })();
  }

  /* 登录页 · 立体 3D 智能工业控制中枢 */
  function initAuthVisual() {
    var c = $('#authVisual');
    if (!c) return;
    var ctx = c.getContext('2d');
    var rr = dpr();
    var W = 0, H = 0;
    function resize() {
      W = c.clientWidth; H = c.clientHeight;
      c.width = W * rr; c.height = H * rr;
      ctx.setTransform(rr, 0, 0, rr, 0, 0);
    }
    resize();
    on(window, 'resize', resize);

    function loop() {
      var t = performance.now() / 1000;
      ctx.clearRect(0, 0, W, H);
      var cx = W / 2, cy = H / 2;
      var R = Math.min(W, H) * 0.34;
      ctx.save();
      ctx.translate(cx, cy);

      // 陀螺仪式三环
      var rings = [
        { rx: R, ry: R * 0.34, rot: t * 0.5, sp: 0.9, color: 'rgba(77,179,240,0.55)' },
        { rx: R * 0.86, ry: R * 0.86, rot: t * 0.36 + 1.2, sp: 0.55, color: 'rgba(77,179,240,0.28)' },
        { rx: R * 0.62, ry: R * 0.22, rot: t * 0.72 + 2.1, sp: 1.3, color: 'rgba(211,172,92,0.4)' }
      ];
      rings.forEach(function (rg) {
        ctx.save();
        ctx.rotate(rg.rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, rg.rx, rg.ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = rg.color;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        // 环上脉冲光点
        for (var k = 0; k < 3; k++) {
          var a = t * rg.sp * 2 + k * 2.1;
          var px = Math.cos(a) * rg.rx, py = Math.sin(a) * rg.ry;
          ctx.fillStyle = 'rgba(160,215,250,0.95)';
          ctx.beginPath(); ctx.arc(px, py, 2.4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      });

      // 悬浮核心发光球
      var g = ctx.createRadialGradient(0, 0, 2, 0, 0, R * 0.44);
      g.addColorStop(0, 'rgba(190,225,250,0.9)');
      g.addColorStop(0.4, 'rgba(77,179,240,0.36)');
      g.addColorStop(1, 'rgba(77,179,240,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, R * 0.44, 0, Math.PI * 2); ctx.fill();

      // 核心旋转线框立方体（AI 底座）
      ctx.save();
      ctx.rotate(t * 0.6);
      var s = R * 0.16;
      ctx.strokeStyle = 'rgba(225,238,250,0.85)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-s, -s, s * 2, s * 2);
      ctx.strokeStyle = 'rgba(225,238,250,0.32)';
      ctx.beginPath();
      ctx.moveTo(-s, -s); ctx.lineTo(-s * 0.6, -s * 0.6);
      ctx.moveTo(s, -s); ctx.lineTo(s * 0.6, -s * 0.6);
      ctx.moveTo(-s, s); ctx.lineTo(-s * 0.6, s * 0.6);
      ctx.moveTo(s, s); ctx.lineTo(s * 0.6, s * 0.6);
      ctx.stroke();
      ctx.strokeRect(-s * 0.6, -s * 0.6, s * 1.2, s * 1.2);
      ctx.restore();

      // 辐射连接线
      for (var i = 0; i < 28; i++) {
        var a2 = i / 28 * Math.PI * 2 + t * 0.18;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a2) * R * 0.16, Math.sin(a2) * R * 0.16);
        ctx.lineTo(Math.cos(a2) * R, Math.sin(a2) * R * 0.34);
        ctx.strokeStyle = 'rgba(77,179,240,0.13)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // 底部发光基座
      var g2 = ctx.createRadialGradient(0, R * 0.62, 0, 0, R * 0.62, R * 0.55);
      g2.addColorStop(0, 'rgba(14,122,214,0.4)');
      g2.addColorStop(1, 'rgba(14,122,214,0)');
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.ellipse(0, R * 0.66, R * 0.82, R * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  /* ----------------------------------------------------------------------
   * 5. 驾驶舱图表库（Canvas 手写，零依赖）
   * -------------------------------------------------------------------- */
  function setupCanvas(c) {
    var r = dpr();
    var w = c.clientWidth, h = c.clientHeight || 220;
    c.width = w * r; c.height = h * r;
    var ctx = c.getContext('2d');
    ctx.setTransform(r, 0, 0, r, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  function drawLine(ctx, w, h, data, max, color) {
    var padL = 34, padR = 12, padT = 16, padB = 22;
    var cw = w - padL - padR, ch = h - padT - padB;
    var n = data.length;
    // 网格
    ctx.strokeStyle = 'rgba(77,179,240,0.12)';
    ctx.lineWidth = 1;
    for (var g = 0; g <= 3; g++) {
      var gy = padT + ch * g / 3;
      ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(w - padR, gy); ctx.stroke();
    }
    function px(i) { return padL + (n === 1 ? cw / 2 : cw * i / (n - 1)); }
    function py(v) { return padT + ch * (1 - v / max); }

    // 渐变填充
    var grad = ctx.createLinearGradient(0, padT, 0, padT + ch);
    grad.addColorStop(0, (color || '77,179,240') === '77,179,240' ? 'rgba(77,179,240,0.28)' : 'rgba(211,172,92,0.26)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    data.forEach(function (v, i) { i === 0 ? ctx.moveTo(px(i), py(v)) : ctx.lineTo(px(i), py(v)); });
    ctx.lineTo(px(n - 1), padT + ch); ctx.lineTo(px(0), padT + ch); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    // 折线
    ctx.beginPath();
    data.forEach(function (v, i) { i === 0 ? ctx.moveTo(px(i), py(v)) : ctx.lineTo(px(i), py(v)); });
    ctx.strokeStyle = color === 'gold' ? '#d3ac5c' : '#4db3f0';
    ctx.lineWidth = 2; ctx.stroke();

    // 数据点
    data.forEach(function (v, i) {
      ctx.beginPath(); ctx.arc(px(i), py(v), 3, 0, Math.PI * 2);
      ctx.fillStyle = color === 'gold' ? '#d3ac5c' : '#4db3f0'; ctx.fill();
    });

    // X 轴标签
    ctx.fillStyle = '#7fa6c6'; ctx.font = '11px ' + '"PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    data.forEach(function (v, i) { ctx.fillText(i + 1, px(i), h - 6); });
  }

  function drawBars(ctx, w, h, data, labels) {
    var padL = 12, padR = 12, padT = 20, padB = 24;
    var cw = w - padL - padR, ch = h - padT - padB;
    var max = Math.max.apply(null, data.map(function (d) { return d.value; })) * 1.15;
    var bw = cw / data.length * 0.52;
    var colors = ['#4db3f0', '#6f8ff2', '#9d7be8', '#d3ac5c', '#57d68a', '#e86a5c'];
    data.forEach(function (d, i) {
      var x = padL + cw * (i + 0.5) / data.length - bw / 2;
      var bh = ch * d.value / max;
      var y = padT + ch - bh;
      var g = ctx.createLinearGradient(0, y, 0, padT + ch);
      g.addColorStop(0, colors[i % colors.length]);
      g.addColorStop(1, colors[i % colors.length] + '33');
      ctx.fillStyle = g;
      roundRect(ctx, x, y, bw, bh, 4); ctx.fill();
      ctx.fillStyle = '#7fa6c6'; ctx.font = '11px ' + '"PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], padL + cw * (i + 0.5) / data.length, h - 8);
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawDonut(ctx, w, h, segments, cx, cy, R) {
    cx = cx || w / 2; cy = cy || h / 2; R = R || Math.min(w, h) / 2 - 10;
    var total = segments.reduce(function (a, b) { return a + b.value; }, 0);
    var start = -Math.PI / 2;
    var r0 = R * 0.62;
    segments.forEach(function (s) {
      var ang = s.value / total * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, R, start, start + ang);
      ctx.arc(cx, cy, r0, start + ang, start, true);
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
      start += ang;
    });
    // 中心文字
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.font = '700 22px ' + '"SFMono-Regular", monospace';
    ctx.fillText(fmt(total), cx, cy - 2);
    ctx.fillStyle = '#7fa6c6'; ctx.font = '11px ' + '"PingFang SC", sans-serif';
    ctx.fillText('总计', cx, cy + 16);
  }

  function drawRadar(ctx, w, h, values, labels, max) {
    var cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 26;
    var n = values.length;
    var ang = function (i) { return -Math.PI / 2 + i * Math.PI * 2 / n; };
    // 蛛网
    for (var ring = 1; ring <= 4; ring++) {
      ctx.beginPath();
      for (var i = 0; i < n; i++) {
        var rr = R * ring / 4;
        var x = cx + Math.cos(ang(i)) * rr, y = cy + Math.sin(ang(i)) * rr;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(77,179,240,0.15)'; ctx.lineWidth = 1; ctx.stroke();
    }
    for (var a = 0; a < n; a++) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang(a)) * R, cy + Math.sin(ang(a)) * R);
      ctx.strokeStyle = 'rgba(77,179,240,0.12)'; ctx.stroke();
    }
    // 数据面
    ctx.beginPath();
    values.forEach(function (v, i) {
      var rr = R * clamp(v / max, 0, 1);
      var x = cx + Math.cos(ang(i)) * rr, y = cy + Math.sin(ang(i)) * rr;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(77,179,240,0.25)'; ctx.fill();
    ctx.strokeStyle = '#4db3f0'; ctx.lineWidth = 2; ctx.stroke();
    // 标签
    ctx.fillStyle = '#7fa6c6'; ctx.font = '11px ' + '"PingFang SC", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    values.forEach(function (v, i) {
      var lx = cx + Math.cos(ang(i)) * (R + 16), ly = cy + Math.sin(ang(i)) * (R + 16);
      ctx.fillText(labels[i], lx, ly);
    });
    ctx.textBaseline = 'alphabetic';
  }

  function initDashboard() {
    var body = document.body;
    if (!body.classList.contains('dash-body')) return;

    // 粒子背景
    var pc = $('#dashParticles');
    if (pc) {
      var field = new ParticleField(pc, {
        count: 60, linkDist: 110,
        color: 'rgba(77,179,240,ALPHA)', radius: 420, geo: false
      });
      field.start();
    }

    // 时钟
    var clock = $('#dashClock');
    function tickClock() {
      if (!clock) return;
      var d = new Date();
      var p = function (n) { return (n < 10 ? '0' : '') + n; };
      clock.textContent = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '  ' +
        p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
    }
    tickClock();
    setInterval(tickClock, 1000);

    // KPI 数字
    $$('.dash-kpi__item b[data-value]').forEach(function (el) {
      var val = parseFloat(el.getAttribute('data-value'));
      var unit = el.getAttribute('data-unit') || '';
      var main = document.createElement('span'); main.className = 'num';
      el.appendChild(main);
      if (unit) { var u = document.createElement('span'); u.className = 'unit'; u.textContent = unit; el.appendChild(u); }
      animateNumber(main, val, { duration: 1400 });
    });

    // 折线图 —— 平台用户增长
    var line = $('#chartUserTrend');
    if (line) {
      var s = setupCanvas(line);
      var months = [1286, 2410, 3760, 5240, 6930, 8260, 9640, 11050, 12860];
      drawLine(s.ctx, s.w, s.h, months, 14000);
    }

    // 折线图 —— 成果转化趋势
    var line2 = $('#chartTransformTrend');
    if (line2) {
      var s2 = setupCanvas(line2);
      drawLine(s2.ctx, s2.w, s2.h, [6, 9, 14, 18, 25, 31, 38, 42, 47], 52, 'gold');
    }

    // 柱状图 —— 六大领域需求分布
    var bars = $('#chartDomain');
    if (bars) {
      var sb = setupCanvas(bars);
      drawBars(sb.ctx, sb.w, sb.h, [
        { value: 86 }, { value: 74 }, { value: 68 }, { value: 59 }, { value: 52 }, { value: 41 }
      ], ['航天', '航空', '电子', '兵器', '船舶', '核']);
    }

    // 环形图 —— 成果类型分布
    var donut = $('#chartOutcome');
    if (donut) {
      var sd = setupCanvas(donut);
      drawDonut(sd.ctx, sd.w, sd.h, [
        { value: 42, color: '#4db3f0' }, { value: 28, color: '#9d7be8' },
        { value: 24, color: '#d3ac5c' }, { value: 18, color: '#57d68a' }
      ]);
    }

    // 雷达图 —— 生态健康度
    var radar = $('#chartHealth');
    if (radar) {
      var sr = setupCanvas(radar);
      drawRadar(sr.ctx, sr.w, sr.h, [82, 76, 88, 71, 79, 84],
        ['人才', '技术', '产业', '资本', '政策', '生态'], 100);
    }

    // 雷达图 —— 人才画像示例
    var radar2 = $('#chartTalent');
    if (radar2) {
      var sr2 = setupCanvas(radar2);
      drawRadar(sr2.ctx, sr2.w, sr2.h, [88, 74, 91, 68, 82, 76],
        ['知识', '技能', '素养', '工程', '创新', '协作'], 100);
    }
  }

  /* ----------------------------------------------------------------------
   * 6. 登录表单
   * -------------------------------------------------------------------- */
  function initLogin() {
    var form = $('#loginForm');
    if (!form) return;
    on(form, 'submit', function (e) {
      e.preventDefault();
      var u = $('#loginUser').value.trim();
      var p = $('#loginPass').value.trim();
      var btn = $('#loginBtn');
      if (!u || !p) {
        toast('请输入用户名和密码', 'warn');
        return;
      }
      btn.disabled = true;
      btn.textContent = '验证中…';
      setTimeout(function () {
        btn.disabled = false;
        btn.textContent = '登 录';
        toast('已提交验证（演示环境）', 'ok');
      }, 900);
    });
  }

  /* Toast */
  function toast(msg, type) {
    var old = $('#toast');
    if (old) old.remove();
    var el = document.createElement('div');
    el.id = 'toast';
    el.textContent = msg;
    el.style.cssText = 'position:fixed;left:50%;bottom:48px;transform:translateX(-50%);z-index:99999;' +
      'padding:12px 22px;border-radius:8px;font-size:14px;color:#fff;' +
      'background:' + (type === 'ok' ? 'rgba(23,122,61,0.95)' : 'rgba(194,56,44,0.95)') + ';' +
      'box-shadow:0 8px 24px rgba(0,0,0,0.3);transition:opacity .4s,transform .4s;';
    document.body.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0'; el.style.transform = 'translateX(-50%) translateY(8px)';
      setTimeout(function () { el.remove(); }, 400);
    }, 2200);
  }

  /* ----------------------------------------------------------------------
   * 6b. 内容分区交互：Tabs 筛选 / 倒计时 / 进度条 / 演示 Toast
   * -------------------------------------------------------------------- */
  function initTabs() {
    $$('[data-tabs]').forEach(function (wrap) {
      var target = document.getElementById(wrap.getAttribute('data-tabs'));
      if (!target) return;
      var items = target.querySelectorAll('[data-src], [data-ct], [data-jt]');
      var tabs = wrap.querySelectorAll('.tab');
      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
          tabs.forEach(function (t) { t.classList.remove('active'); });
          tab.classList.add('active');
          var f = tab.getAttribute('data-f');
          items.forEach(function (it) {
            var key = it.getAttribute('data-src') || it.getAttribute('data-ct') || it.getAttribute('data-jt');
            it.style.display = (f === 'all' || key === f) ? '' : 'none';
          });
        });
      });
    });
  }

  function initCountdown() {
    $$('[data-deadline]').forEach(function (el) {
      var target = new Date(el.getAttribute('data-deadline')).getTime();
      function tick() {
        var diff = target - Date.now();
        if (diff <= 0) { el.textContent = '已截止'; return; }
        var d = Math.floor(diff / 86400000);
        var h = Math.floor(diff % 86400000 / 3600000);
        var m = Math.floor(diff % 3600000 / 60000);
        var s = Math.floor(diff % 60000 / 1000);
        var p = function (x) { return (x < 10 ? '0' : '') + x; };
        el.innerHTML = (d > 0 ? d + '<i>天</i> ' : '') + p(h) + ':' + p(m) + ':' + p(s);
      }
      tick();
      setInterval(tick, 1000);
    });
  }

  function initBars() {
    var cards = $$('.ep-card');
    if (!cards.length) return;
    if (!('IntersectionObserver' in window)) { cards.forEach(function (c) { c.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.3 });
    cards.forEach(function (c) { io.observe(c); });
  }

  function initToastBind() {
    $$('[data-toast]').forEach(function (el) {
      el.addEventListener('click', function () { toast(el.getAttribute('data-toast'), 'ok'); });
    });
  }

  /* ----------------------------------------------------------------------
   * 7. 启动
   * -------------------------------------------------------------------- */
  function boot() {
    initNav();
    initHeroParticles();
    initAuthFlow();
    initAuthVisual();
    initStatCounters();
    initReveal();
    initSideNav();
    initTabs();
    initCountdown();
    initBars();
    initToastBind();
    initDashboard();
    initLogin();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
