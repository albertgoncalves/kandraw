#!/usr/bin/env python3

from glob import glob

import json
import logging
import os
import random

from lxml import etree

import flask
import pykakasi

PATH = "data.json"

if os.path.exists(PATH):
    with open(PATH, "r") as file:
        DATA = json.load(file)
else:
    DATA = {}

    for path in glob(os.path.join("svg", "kanji", "*")):
        with open(path, "rb") as file:
            svg = etree.fromstring(file.read())
            character = svg.xpath(
                f"//*[@id = 'kvg:{os.path.splitext(os.path.basename(path))[0]}']",
            )[0].get("{http://kanjivg.tagaini.net}element")
            DATA[character] = {
                "svg": etree.tostring(svg).decode(),
                "consec": 0,
            }

    with open(PATH, "w") as file:
        json.dump(DATA, file)

APP = flask.Flask(__name__)
KAKASI = pykakasi.kakasi()


@APP.route("/")
def index():
    return flask.render_template("index.html")


@APP.route("/next", methods=["POST"])
def next():
    body = flask.request.get_json()

    if body["character"] is not None:
        key = body["character"]
        if body["correct"]:
            DATA[key]["consec"] += 1
        else:
            DATA[key]["consec"] = max(0, min(4, DATA[key]["consec"] - 1))

        with open(PATH, "w") as file:
            json.dump(DATA, file)

    # fmt: off
    choices = [
        ("あ",  "a"), ("い",   "i"), ("う",   "u"), ("え",  "e"), ("お",  "o"),
        ("か", "ka"), ("き",  "ki"), ("く",  "ku"), ("け", "ke"), ("こ", "ko"),
      # ("が", "ga"), ("ぎ",  "gi"), ("ぐ",  "gu"), ("げ", "ge"), ("ご", "go"),
        ("さ", "sa"), ("し", "shi"), ("す",  "su"), ("せ", "se"), ("そ", "so"),
      # ("ざ", "za"), ("じ",  "ji"), ("ず",  "zu"), ("ぜ", "ze"), ("ぞ", "zo"),
        ("た", "ta"), ("ち", "chi"), ("つ", "tsu"), ("て", "te"), ("と", "to"),
      # ("だ", "da"), ("ぢ", "dzi"), ("づ", "dzu"), ("で", "de"), ("ど", "do"),
        ("な", "na"), ("に",  "ni"), ("ぬ",  "nu"), ("ね", "ne"), ("の", "no"),
        ("は", "ha"), ("ひ",  "hi"), ("ふ",  "fu"), ("へ", "he"), ("ほ", "ho"),
      # ("ば", "ba"), ("び",  "bi"), ("ぶ",  "bu"), ("べ", "be"), ("ぼ", "bo"),
      # ("ぱ", "pa"), ("ぴ",  "pi"), ("ぷ",  "pu"), ("ぺ", "pe"), ("ぽ", "po"),
        ("ま", "ma"), ("み",  "mi"), ("む",  "mu"), ("め", "me"), ("も", "mo"),
        ("や", "ya"),                ("ゆ",  "yu"),               ("よ", "yo"),
        ("ら", "ra"), ("り",  "ri"), ("る",  "ru"), ("れ", "re"), ("ろ", "ro"),
        ("わ", "wa"),                                             ("を", "wo"),

        ("ん", "n"),
    ]
    # fmt: on

    while True:
        (hiragana, prompt) = random.choice(choices)
        katakana = KAKASI.convert(hiragana)[0]["kana"]
        if (body["character"] is None) or (katakana != body["character"]):
            break

    return {
        **{
            "character": katakana,
            "prompt": f'"{prompt}" (katakana)',
        },
        **DATA[katakana],
    }


def main():
    logging.getLogger("werkzeug").setLevel(logging.ERROR)
    APP.run(host="0.0.0.0", port="8000", debug=False)


if __name__ == "__main__":
    main()
