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

function reset(canvas, context, lines, consec, h1, prompt) {
    context.clearRect(0, 0, canvas.width, canvas.height);

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
    context.setLineDash([]);

    // NOTE: See `https://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/`.
    let   h = 0;
    const goldenRatio = (((Math.sqrt(5) + 1) / 2) % 1) * 360;

    const offset = 0;

    const alphaFill = Math.max(0, 0.9 - (consec * 0.25));
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

    context.strokeStyle = "hsl(0, 0%, 90%)";

    h1.textContent = prompt;
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

function toCanvas(canvas, event) {
    // NOTE: The rect moves whenever the page is resized or scrolled, and includes the border.
    const rect = canvas.getBoundingClientRect();

    return [
        (event.clientX - rect.left) - canvas.clientLeft,
        (event.clientY - rect.top) - canvas.clientTop,
    ];
}

function pushPoint(context, stroke, point) {
    const n = stroke.length;

    if ((stroke[n - 1][0] !== point[0]) || (stroke[n - 1][1] !== point[1])) {
        context.lineTo(point[0], point[1]);
        context.stroke();

        stroke.push(point);
    }
}

window.onload = function() {
    const canvas = document.getElementById("canvas");
    const h1 = document.getElementById("prompt");
    const h2 = document.getElementById("score");

    const context = canvas.getContext("2d");

    context.font = "16px monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";

    const canvasScale = Math.min(canvas.width, canvas.height);
    const scoreScale = Math.max(canvas.width, canvas.height) / 8;

    let answer = [];
    let character = null;
    let prompt = "";
    let consec = 0;

    const next = function(body) {
        // NOTE: Ignore input until the next character arrives.
        answer = [];

        fetch("/next", {
            body: JSON.stringify(body),
            method: "POST",
            headers: {"Content-Type": "application/json"}
        })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error(response.status.toString());
                }
                return response.json();
            })
            .then(function(json) {
                const svg =
                    (new DOMParser()).parseFromString(json.svg, "image/svg+xml").documentElement;
                answer = toPoints(svg, canvasScale);
                character = json.character;
                prompt = json.prompt;
                consec = json.consec;

                reset(canvas, context, answer, consec, h1, prompt);
            });
    };

    let correct = true;

    next({character, correct});

    let drawing = false;
    let review = false;
    let strokes = [];

    const clear = function() {
        drawing = false;
        reset(canvas, context, answer, consec, h1, prompt);
        strokes = [];
    };

    canvas.addEventListener("pointerdown", function(event) {
        if ((!event.isPrimary) || (event.button !== 0) || (answer.length === 0)) {
            return;
        }

        // NOTE: Keep receiving events (including `pointerup`) after the pointer leaves the canvas.
        canvas.setPointerCapture(event.pointerId);

        const point = toCanvas(canvas, event);

        context.beginPath();
        context.moveTo(point[0], point[1]);

        drawing = true;
        strokes.push([point]);
    }, false);

    canvas.addEventListener("pointerup", function(event) {
        if ((!event.isPrimary) || (!drawing)) {
            return;
        }
        drawing = false;

        pushPoint(context, strokes[strokes.length - 1], toCanvas(canvas, event));

        if (review) {
            next({character, correct});
            correct = true;
            review = false;
            strokes = [];
            return;
        }

        // NOTE: A click without any movement isn't a stroke.
        if (strokes[strokes.length - 1].length === 1) {
            strokes.pop();
            return;
        }

        if ((answer.length === 0) || (strokes.length !== answer.length)) {
            return;
        }

        const s = score(strokes, answer) / scoreScale;
        if (s < 1) {
            h2.textContent = `${character} \u2705 (${s.toFixed(2)})`;
            review = true;

            reset(canvas, context, answer, 0, h1, prompt);

            const prevStrokeStyle = context.strokeStyle;
            context.strokeStyle = "hsl(0, 0%, 100%, 0.325)";

            context.beginPath();
            for (let stroke of strokes) {
                context.moveTo(stroke[0][0], stroke[0][1]);
                for (let point of stroke.slice(1)) {
                    context.lineTo(point[0], point[1]);
                }
            }
            context.stroke();

            context.strokeStyle = prevStrokeStyle;

        } else {
            h2.textContent = `${character} \u274C (${s.toFixed(2)})`;
            consec = 0;
            correct = false;
            reset(canvas, context, answer, consec, h1, prompt);
        }

        strokes = [];
    }, false);

    canvas.addEventListener("pointermove", function(event) {
        if ((!event.isPrimary) || (!drawing)) {
            return;
        }
        pushPoint(context, strokes[strokes.length - 1], toCanvas(canvas, event));
    }, false);

    canvas.addEventListener("pointercancel", function(event) {
        if ((!event.isPrimary) || (!drawing)) {
            return;
        }
        clear();
    }, false);

    canvas.addEventListener("contextmenu", function(event) {
        event.preventDefault();
        clear();
    }, true);
};
