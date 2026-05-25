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
function cubicBezier(p0, p1, p2, p3) {
    const b = [p0];

    const steps = 10;

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
    context.strokeStyle = "hsl(0, 0%, 18%, 0.75)";
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

// NOTE: See `https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/d#cubic_b%C3%A9zier_curve`.
function parse(svg) {
    const lines = [];

    for (let path of svg.getElementsByTagName("path")) {
        const d = path.getAttribute("d");

        const tokens = [];

        {
            let i = 0;
            let j = 0;

            const pushIf = function() {
                if (i !== j) {
                    tokens.push(d.slice(i, j));
                }
            };

            for (; j < d.length; ++j) {
                if ("MCc".includes(d[j])) {
                    pushIf();
                    tokens.push(d[j]);
                    i = j + 1;
                } else if (" ,".includes(d[j])) {
                    pushIf();
                    i = j + 1;
                } else if (d[j] === "-") {
                    pushIf();
                    i = j;
                }
            }
            pushIf();
        }

        const points = [];

        {
            let i = 0;
            let prevToken = null;

            const parsers = {
                M: function() {
                    points.push([Number(tokens[i + 0]), Number(tokens[i + 1])]);
                    i += 2;
                },
                C: function() {
                    const point = points.pop();
                    points.push(...cubicBezier([...point],
                                               [Number(tokens[i + 0]), Number(tokens[i + 1])],
                                               [Number(tokens[i + 2]), Number(tokens[i + 3])],
                                               [Number(tokens[i + 4]), Number(tokens[i + 5])]));
                    i += 6;
                },
                c: function() {
                    const point = points.pop();
                    points.push(...cubicBezier(
                        [...point],
                        [point[0] + Number(tokens[i + 0]), point[1] + Number(tokens[i + 1])],
                        [point[0] + Number(tokens[i + 2]), point[1] + Number(tokens[i + 3])],
                        [point[0] + Number(tokens[i + 4]), point[1] + Number(tokens[i + 5])]));
                    i += 6;
                },
            };

            for (; i < tokens.length;) {
                if ("MCc".includes(tokens[i])) {
                    prevToken = tokens[i];
                    parsers[tokens[i++]]();
                } else if (prevToken !== null) {
                    parsers[prevToken]();
                } else {
                    throw new Error(tokens[i]);
                }
            }
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
    const scoreScale = Math.max(canvas.width, canvas.height) / 15;

    const svg = document.getElementById("kanji-svg").contentDocument.children[0];
    const kanji = svg.children[0].children[0].getAttribute("kvg:element");
    if (kanji === "干") {
        document.getElementById("prompt").textContent = "sêco, ressecar";
    } else if (kanji === "年") {
        document.getElementById("prompt").textContent = "ano";
    }
    const answer = parse(svg);
    for (let i = 0; i < answer.length; ++i) {
        for (let j = 0; j < answer[i].length; ++j) {
            answer[i][j][0] = (answer[i][j][0] / svg.getAttribute("width")) * canvasScale;
            answer[i][j][1] = (answer[i][j][1] / svg.getAttribute("height")) * canvasScale;
        }
    }

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
