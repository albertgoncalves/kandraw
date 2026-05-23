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

// NOTE: See `https://en.wikipedia.org/wiki/B%C3%A9zier_curve#/media/File:B%C3%A9zier_3_big.svg`.
function cubicBezier(p0, p1, p2, p3, steps) {
    const b = [p0];

    for (let i = 1; i < steps; ++i) {
        const t = i / steps;
        const q0 = lerp2(p0, p1, t);
        const q1 = lerp2(p1, p2, t);
        const q2 = lerp2(p2, p3, t);
        const r0 = lerp2(q0, q1, t);
        const r1 = lerp2(q1, q2, t);
        b.push(lerp2(r0, r1, t));
    }

    b.push(p3);

    return b;
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
    if (from.length !== to.length) {
        return Number.POSITIVE_INFINITY;
    }

    let error = 0;

    for (let i = 0; i < from.length; ++i) {
        if (from[i].length <= 1) {
            return Number.POSITIVE_INFINITY;
        }

        let a = from[i];
        let b = to[i];

        if (a.length < b.length) {
            a = resample(a, b);
        } else {
            b = resample(b, a);
        }

        let e = 0;

        for (let j = 0; j < a.length; ++j) {
            e += distance(a[j], b[j]);
        }

        error = Math.max(error, e / a.length);
    }

    return error;
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

function draw(context, lines) {
    const prevStrokeStyle = context.strokeStyle;

    context.strokeStyle = "hsl(180, 90%, 50%, 0.15)";

    for (let i = 0; i < lines.length; ++i) {
        context.beginPath();
        context.moveTo(lines[i][0][0], lines[i][0][1]);

        for (let j = 1; j < lines[i].length; ++j) {
            context.lineTo(lines[i][j][0], lines[i][j][1]);
        }

        context.stroke();
    }

    context.strokeStyle = prevStrokeStyle;
}

window.onload = function() {
    const canvas = document.getElementById("canvas");
    const context = canvas.getContext("2d");
    const h2 = document.getElementById("score");

    const k = Math.max(canvas.width, canvas.height) / 30;

    const answer = [
        cubicBezier([100, 300], [50, 100], [250, 100], [350, 350], 50),
        [[400, 225], [400, 325]],
    ];

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
    }, false);

    canvas.addEventListener("mousemove", function(event) {
        if (drawing) {
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            const n = strokes[strokes.length - 1].length;

            if ((strokes[strokes.length - 1][n - 1][0] !== x) ||
                (strokes[strokes.length - 1][n - 1][1] !== y))
            {
                context.lineTo(x, y);
                context.stroke();

                strokes[strokes.length - 1].push([x, y]);

                const s = score(strokes, answer) / k;
                h2.textContent = (s < 1 ? "\u2705" : "\u274C") + ` (${s.toFixed(2)})`;
            }
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
