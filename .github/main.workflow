workflow "Compile, lint, test" {
  on = "push"
  resolves = ["test", "generate dts"]
}

action "install" {
  uses = "actions/npm@v2.0.0"
  runs = "npm"
  args = "install"
  env = {
    NPM_CONFIG_USERCONFIG = ".github/.npmrc"
  }
}

action "compile" {
  uses = "actions/npm@v2.0.0"
  needs = ["install"]
  runs = "npm"
  args = "run compile"
}

action "lint" {
  uses = "actions/npm@v2.0.0"
  needs = ["install"]
  runs = "npm"
  args = "run lint"
}

action "compile tests" {
  uses = "actions/npm@v2.0.0"
  needs = ["compile", "lint"]
  runs = "npm"
  args = "run compile-tests"
}

action "test" {
  uses = "actions/npm@v2.0.0"
  needs = ["compile tests"]
  runs = "npm"
  args = "test"
}

action "generate dts" {
  uses = "actions/npm@v2.0.0"
  needs = ["compile tests"]
  runs = "npm"
  args = "run bundle-dts"
}
