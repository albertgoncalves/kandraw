"use strict";

function distance(a, b) {
    const x = a[0] - b[0];
    const y = a[1] - b[1];

    return Math.sqrt((x * x) + (y * y));
}

function cumulativeDistances(points) {
    let ds = [0];
    let d = 0;

    for (let i = 1; i < points.length; ++i) {
        d += distance(points[i - 1], points[i]);
        ds.push(d);
    }

    return ds;
}

function lerp1(a, b, t) {
    return a + (t * (b - a));
}

function lerp2(a, b, t) {
    return [lerp1(a[0], b[0], t), lerp1(a[1], b[1], t)];
}

function resample(from, to) {
    const a = cumulativeDistances(from);
    const b = cumulativeDistances(to);
    const c = [from[0]];

    let j = 1;

    for (let i = 1; i < b.length; ++i) {
        const t = (b[i] / b[b.length - 1]) * a[a.length - 1];
        for (; a[j] < t; ++j) {
        }
        c.push(lerp2(from[j - 1], from[j], (t - a[j - 1]) / (a[j] - a[j - 1])));
    }

    return c;
}

function score(from, to) {
    if (from.length < to.length) {
        from = resample(from, to);
    } else {
        to = resample(to, from);
    }

    let error = 0;

    for (let i = 0; i < from.length; ++i) {
        error += distance(from[i], to[i]);
    }

    return error / from.length;
}

function reset(canvas, context) {
    context.lineCap = "butt";
    context.lineWidth = 2;
    context.strokeStyle = "hsl(0, 0%, 18%)";
    context.setLineDash([5, 5]);

    context.beginPath();

    context.moveTo(0, canvas.height / 2);
    context.lineTo(canvas.width, canvas.height / 2);

    context.moveTo(canvas.width / 2, 0);
    context.lineTo(canvas.width / 2, canvas.height);

    context.stroke();

    context.lineCap = "round";
    context.lineWidth = 5;
    context.strokeStyle = "hsl(0, 0%, 90%)";
    context.setLineDash([]);
}

function draw(context, points) {
    if (points.length === 0) {
        return;
    }

    const prevStrokeStyle = context.strokeStyle;

    context.strokeStyle = "hsl(180, 90%, 50%, 0.15)";

    context.beginPath();
    context.moveTo(points[0][0], points[0][1]);

    for (let i = 1; i < points.length; ++i) {
        context.lineTo(points[i][0], points[i][1]);
    }

    context.stroke();

    context.strokeStyle = prevStrokeStyle;
}

window.onload = function() {
    const canvas = document.getElementById("canvas");
    const context = canvas.getContext("2d");
    const h2 = document.getElementById("score");

    const answer = [[100, 200], [400, 200], [400, 300]];

    reset(canvas, context);
    draw(context, answer);

    const rect = canvas.getBoundingClientRect();

    let   drawing = false;
    const strokes = [];

    canvas.addEventListener("mousedown", function(event) {
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        context.beginPath();
        context.moveTo(x, y);

        drawing = true;
        strokes.push([[x, y]]);
    }, false);

    canvas.addEventListener("mouseup", function(event) {
        if (!drawing) {
            return;
        }

        context.lineTo(event.clientX - rect.left, event.clientY - rect.top);
        context.stroke();

        drawing = false;

        const s = score(answer, strokes[strokes.length - 1]) / 25;
        h2.textContent = (s < 1 ? "\u2705" : "\u274C") + ` (${s.toFixed(2)})`;
    }, false);

    canvas.addEventListener("mousemove", function(event) {
        if (drawing) {
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            context.lineTo(x, y);
            context.stroke();

            strokes[strokes.length - 1].push([x, y]);
        }
    }, false);

    document.addEventListener("keyup", function(event) {
        if (drawing) {
            return;
        }

        if (event.key === "r") {
            context.clearRect(0, 0, canvas.width, canvas.height);
            h2.textContent = "";
            reset(canvas, context);
            draw(context, answer);
            strokes.length = 0;
        }
    }, true);
};
