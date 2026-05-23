with import <nixpkgs> {};
mkShell.override { stdenv = llvmPackages_21.stdenv; } {
    buildInputs = [
        html-tidy
        jq
        nodePackages.jshint
        nodePackages.typescript
    ];
    shellHook = ''
        . .shellhook
    '';
}
