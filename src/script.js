"use strict";

function distance(a, b) {
    return Math.sqrt(((a[0] - b[0]) ** 2) + ((a[1] - b[1]) ** 2));
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
    if (from.length !== to.length) {
        return Infinity;
    }

    let error = 0;

    for (let i = 0; i < from.length; ++i) {
        if (from[i].length <= 1) {
            return Infinity;
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
    const halfWidth = canvas.width / 2;
    const halfHeight = canvas.height / 2;

    context.lineCap = "butt";
    context.lineJoin = "miter";
    context.lineWidth = 2;
    context.strokeStyle = "hsl(0, 0%, 18%)";
    context.setLineDash([5, 5]);

    context.beginPath();

    context.moveTo(0, halfHeight);
    context.lineTo(canvas.width, halfHeight);

    context.moveTo(halfWidth, 0);
    context.lineTo(halfWidth, canvas.height);

    context.stroke();

    const quarterWidth = canvas.width / 4;
    const quarterHeight = canvas.height / 4;

    const threeQuarterWidth = canvas.width * (3 / 4);
    const threeQuarterHeight = canvas.height * (3 / 4);

    context.lineWidth = 1;
    context.setLineDash([3, 3]);

    context.beginPath();

    context.moveTo(0, quarterHeight);
    context.lineTo(canvas.width, quarterHeight);

    context.moveTo(0, threeQuarterHeight);
    context.lineTo(canvas.width, threeQuarterHeight);

    context.moveTo(quarterWidth, 0);
    context.lineTo(quarterWidth, canvas.height);

    context.moveTo(threeQuarterWidth, 0);
    context.lineTo(threeQuarterWidth, canvas.height);

    context.stroke();

    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 5;
    context.strokeStyle = "hsl(0, 0%, 90%)";
    context.setLineDash([]);
}

function draw(context, lines, k) {
    const prevStrokeStyle = context.strokeStyle;

    // NOTE: See `https://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/`.
    let   h = 0;
    const goldenRatio = (((Math.sqrt(5) + 1) / 2) % 1) * 360;

    const offset = 0;

    const alphaFill = Math.max(0, 0.9 - (k * 0.25));
    const alphaStroke = (alphaFill / 0.9) * 0.75;

    for (let i = 0; i < lines.length; ++i) {
        h = (h + goldenRatio) % 360;

        context.fillStyle = `hsl(${h}, 90%, 75%, ${alphaFill})`;
        context.strokeStyle = `hsl(${h}, 90%, 40%, ${alphaStroke})`;

        context.beginPath();
        context.moveTo(lines[i][0][0], lines[i][0][1]);

        for (let j = 1; j < lines[i].length; ++j) {
            context.lineTo(lines[i][j][0], lines[i][j][1]);
        }

        context.stroke();

        context.fillText((i + 1).toString(), lines[i][0][0] - offset, lines[i][0][1] - offset);
    }

    context.strokeStyle = prevStrokeStyle;
}

function toPoints(svg, scale) {
    const lines = [];

    for (let path of svg.getElementsByTagName("path")) {
        const points = [];

        // NOTE: See `https://developer.mozilla.org/en-US/docs/Web/API/SVGPathElement/getTotalLength`.
        const n = path.getTotalLength();
        const m = Math.ceil(n);

        for (let i = 0; i <= m; ++i) {
            // NOTE: See `https://developer.mozilla.org/en-US/docs/Web/API/SVGPathElement/getPointAtLength`.
            const point = path.getPointAtLength((i / m) * n);
            points.push([
                (point.x / svg.getAttribute("width")) * scale,
                (point.y / svg.getAttribute("height")) * scale,
            ]);
        }

        lines.push(points);
    }

    return lines;
}

window.onload = function() {
    const canvas = document.getElementById("canvas");
    const context = canvas.getContext("2d");
    const h2 = document.getElementById("score");

    context.font = "16px monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";

    const canvasScale = Math.min(canvas.width, canvas.height);
    const scoreScale = Math.max(canvas.width, canvas.height) / 10;

    const svg = document.getElementById("kanji-svg").contentDocument.children[0];
    const kanji = svg.children[0].children[0].getAttribute("kvg:element");

    if (kanji === "干") {
        document.getElementById("prompt").textContent = "sêco, ressecar";
    } else if (kanji === "年") {
        document.getElementById("prompt").textContent = "ano";
    } else if (kanji === "乙") {
        document.getElementById("prompt").textContent = "o último, duplicar, engenhoso, estranho";
    } else if (kanji === "雨") {
        document.getElementById("prompt").textContent = "chuva";
    } else if (kanji === "折") {
        document.getElementById("prompt").textContent =
            "dobrar, quebrar, fraturar, curvar, produto, submeter";
    } else if (kanji === "書") {
        document.getElementById("prompt").textContent = "escrever";
    }

    const answer = toPoints(svg, canvasScale);

    let k = 0;

    reset(canvas, context);
    draw(context, answer, k);

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

        if (strokes.length === answer.length) {
            const s = score(strokes, answer) / scoreScale;
            if (s < 1) {
                h2.textContent = `${kanji} \u2705 (${s.toFixed(2)})`;
                ++k;
            } else {
                h2.textContent = `${kanji} \u274C (${s.toFixed(2)})`;
                k = Math.max(0, Math.min(4, k - 1));
            }

            context.clearRect(0, 0, canvas.width, canvas.height);
            reset(canvas, context);
            draw(context, answer, k);
            strokes.length = 0;
        }
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
            draw(context, answer, k);
            strokes.length = 0;
        }
    }, true);
};
