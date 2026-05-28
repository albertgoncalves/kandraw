with import <nixpkgs> {};
mkShell.override { stdenv = llvmPackages_21.stdenv; } {
    buildInputs = [
        (python3.withPackages (ps: with ps; [
            black
            flake8
            flask
            lxml
            pykakasi
        ]))
        html-tidy
        jq
        nodePackages.jshint
        nodePackages.typescript
    ];
    shellHook = ''
        . .shellhook
    '';
}
