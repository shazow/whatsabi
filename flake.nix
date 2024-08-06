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
          pkgs.nodejs_22
          pkgs.nodePackages.pnpm

          pkgs.graphviz  # For debugging
          pkgs.gnumake
        ];

        shellHook = ''
          export PS1="[dev] $PS1"
          export PATH=$PWD/node_modules/.bin:$PATH

          [[ ! -d node_modules ]] && pnpm install

          [[ -f .env ]] && source .env
        '';
      };
    });
}
