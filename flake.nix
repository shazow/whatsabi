{
  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem
    (system: let
      pkgs = import nixpkgs {
        inherit system;
      };
    in {
      devShells.default = pkgs.mkShell {
        buildInputs = [
          pkgs.nodejs-18_x

          pkgs.graphviz  # For debugging
          pkgs.gnumake
          pkgs.bun
        ];

        shellHook = ''
          export PS1="[dev] $PS1"
          export PATH=$PWD/node_modules/.bin:$PATH

          [[ ! -d node_modules ]] && npm install

          [[ -f .env ]] && source .env
        '';
      };
    });
}
