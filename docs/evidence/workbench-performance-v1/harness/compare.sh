#!/bin/bash
# Interleaved base (5199) vs candidate (5197) runs under identical settings.
set -u
cd "$(dirname "$0")"
mkdir -p after
S=geometry-radius-slider-key,color-primary-text,mode-toggle,preview-tab-switch,undo-redo
run() { node harness.mjs "${@:3}" --url "http://127.0.0.1:$2" --out "after/$1" >/dev/null 2>after/$1.err || echo "FAIL $1"; }
for w in "base 5199" "cand 5197"; do set -- $w; run $1-desktop-light.json $2 --runs 5 --repeats 20; done
for w in "base 5199" "cand 5197"; do set -- $w; run $1-desktop-light-cpu4.json $2 --runs 3 --repeats 12 --cpu 4 --scenarios $S,sidebar-category-switch; done
for w in "base 5199" "cand 5197"; do set -- $w; run $1-desktop-dark.json $2 --runs 3 --repeats 20 --mode dark --scenarios $S; done
for w in "base 5199" "cand 5197"; do set -- $w; run $1-narrow-light-editor.json $2 --runs 3 --repeats 20 --viewport 390x844 --scenarios geometry-radius-slider-key,color-primary-text; done
for w in "base 5199" "cand 5197"; do set -- $w; run $1-narrow-light-preview.json $2 --runs 3 --repeats 20 --viewport 390x844 --scenarios mode-toggle,preview-tab-switch; done
echo DONE
