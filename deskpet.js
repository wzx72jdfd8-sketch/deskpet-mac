(function () {
  "use strict";

  var petEl = document.getElementById("pet");
  var sprite = document.getElementById("sprite");
  var stage = document.getElementById("stage");
  var hint = document.getElementById("hint");

  var walk = ["pet/walk-1.png", "pet/walk-2.png", "pet/walk-3.png", "pet/walk-4.png"];
  var frames = {
    idle: ["pet/idle.png"],
    walk: walk,
    run: ["pet/run-1.png", walk[1], "pet/run-1.png", walk[3]],
    sit: ["pet/sit.png"],
    sleep: ["pet/sleep.png"],
    dance: ["pet/dance.png", "pet/idle.png"],
    jump: ["pet/jump.png"],
  };

  var mode = "walk";
  var anim = "walk";
  var facing = 1;
  var x = 40;
  var y = 0;
  var vx = 90;
  var size = 140;
  var frame = 0;
  var frameT = 0;
  var phase = 0;
  var held = false;
  var jumping = 0;
  var last = 0;
  var finger = { x: 0, y: 0 };
  var think = 1.5;
  var sitT = 0;

  function maxX() {
    return Math.max(8, stage.clientWidth - size);
  }
  function maxY() {
    return Math.max(8, stage.clientHeight - size - 8);
  }
  function ground() {
    return maxY();
  }

  function setMode(next) {
    mode = next;
    jumping = 0;
    if (next === "walk" || next === "run") {
      anim = next;
      y = ground();
      vx = (facing > 0 ? 1 : -1) * (next === "run" ? 160 : 90);
    } else if (next === "sit") anim = "sit";
    else if (next === "sleep") anim = "sleep";
    else if (next === "dance") anim = "dance";
    else if (next === "follow") {
      anim = "walk";
    }
    frame = 0;
    document.querySelectorAll("[data-mode]").forEach(function (btn) {
      btn.classList.toggle("on", btn.getAttribute("data-mode") === mode);
    });
  }

  function jump() {
    if (held) return;
    jumping = 1;
    anim = "jump";
    frame = 0;
  }

  function src() {
    var list = frames[anim] || frames.idle;
    return list[frame % list.length];
  }

  function layout() {
    var bob = 0;
    if (anim === "walk" || anim === "run") {
      bob = Math.sin(phase * 2) * (anim === "run" ? 5 : 3);
    } else if (anim === "dance") {
      bob = Math.abs(Math.sin(phase * 2)) * 10;
    }
    var jy = 0;
    if (jumping > 0) {
      var u = jumping;
      jy = -110 * 4 * u * (1 - u);
    }
    petEl.style.width = size + "px";
    petEl.style.height = size + "px";
    petEl.style.transform =
      "translate(" +
      Math.round(x) +
      "px," +
      Math.round(y + bob + jy) +
      "px) scaleX(" +
      facing +
      ")";
    if (sprite.getAttribute("src") !== src()) sprite.src = src();
  }

  function tick(now) {
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    phase += dt * (anim === "run" ? 8.5 : anim === "dance" ? 7 : 5.6);
    frameT += dt;
    var fps = anim === "walk" || anim === "run" ? 8 : anim === "dance" ? 4 : 2;
    while (frameT >= 1 / fps) {
      frameT -= 1 / fps;
      frame++;
    }

    if (jumping > 0) {
      jumping += dt / 0.55;
      if (jumping >= 1) {
        jumping = 0;
        anim = mode === "run" ? "run" : mode === "dance" ? "dance" : mode === "sit" ? "sit" : mode === "sleep" ? "sleep" : "walk";
      }
      layout();
      requestAnimationFrame(tick);
      return;
    }

    if (!held) {
      if (mode === "walk" || mode === "run") {
        x += vx * dt;
        y = ground();
        if (x < 0) {
          x = 0;
          vx = Math.abs(vx);
          facing = 1;
        }
        if (x > maxX()) {
          x = maxX();
          vx = -Math.abs(vx);
          facing = -1;
        }
        think -= dt;
        if (mode === "walk" && think <= 0) {
          var roll = Math.random();
          if (roll < 0.12) {
            setMode("sit");
            sitT = 3 + Math.random() * 3;
          } else {
            think = 2 + Math.random() * 3;
            if (Math.random() < 0.12) jump();
          }
        }
      } else if (mode === "follow") {
        var tx = finger.x - size / 2;
        var ty = finger.y - size * 0.7;
        var dx = tx - x;
        var dy = ty - y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 8) {
          anim = dist > 180 ? "run" : "walk";
          facing = dx >= 0 ? 1 : -1;
          var sp = (anim === "run" ? 220 : 130) * dt;
          if (sp > dist) sp = dist;
          x += (dx / dist) * sp;
          y += (dy / dist) * sp;
        } else anim = "idle";
      } else if (mode === "sit") {
        anim = "sit";
        sitT -= dt;
        if (sitT <= 0) setMode("walk");
      } else if (mode === "sleep") anim = "sleep";
      else if (mode === "dance") anim = "dance";
    }

    x = Math.max(0, Math.min(maxX(), x));
    y = Math.max(0, Math.min(maxY(), y));
    layout();
    requestAnimationFrame(tick);
  }

  var drag = { dx: 0, dy: 0, moved: false };

  petEl.addEventListener(
    "pointerdown",
    function (ev) {
      ev.preventDefault();
      petEl.setPointerCapture(ev.pointerId);
      held = true;
      drag.moved = false;
      drag.dx = ev.clientX - x;
      drag.dy = ev.clientY - y;
      anim = "idle";
    },
    { passive: false },
  );
  petEl.addEventListener("pointermove", function (ev) {
    if (!held) return;
    x = ev.clientX - drag.dx;
    y = ev.clientY - drag.dy;
    if (Math.abs(ev.movementX) + Math.abs(ev.movementY) > 2) drag.moved = true;
    layout();
  });
  petEl.addEventListener("pointerup", function () {
    if (!held) return;
    held = false;
    if (!drag.moved) jump();
    else if (mode === "walk" || mode === "run") y = ground();
  });

  stage.addEventListener(
    "pointermove",
    function (ev) {
      finger.x = ev.clientX;
      finger.y = ev.clientY;
    },
    { passive: true },
  );

  document.querySelectorAll("[data-mode]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var m = btn.getAttribute("data-mode");
      if (m === "jump") jump();
      else setMode(m);
    });
  });

  window.addEventListener("resize", function () {
    x = Math.max(0, Math.min(maxX(), x));
    if (mode === "walk" || mode === "run") y = ground();
    layout();
  });

  y = ground();
  x = Math.min(48, maxX());
  setMode("walk");
  layout();
  requestAnimationFrame(tick);

  setTimeout(function () {
    if (hint) hint.classList.add("gone");
  }, 4200);

  var nav = window.navigator;
  if (nav.standalone || window.matchMedia("(display-mode: standalone)").matches) {
    var add = document.getElementById("add");
    if (add) add.style.display = "none";
  }
})();
