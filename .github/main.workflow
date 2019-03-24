workflow "Compile, lint, test and publish" {
  on = "push"
  resolves = ["publish"]
}

action "install" {
  uses = "actions/npm@v2.0.0"
  args = "install"
  env = {
    NPM_CONFIG_USERCONFIG = ".github/.npmrc"
  }
}

action "install min TS" {
  uses = "actions/npm@v2.0.0"
  needs = ["install"]
  args = "install typescript@2.6.1"
  env = {
    NPM_CONFIG_USERCONFIG = ".github/.npmrc"
  }
}

action "install latest TS" {
  uses = "actions/npm@v2.0.0"
  needs = ["install"]
  args = "install typescript@3.3.4000"
  env = {
    NPM_CONFIG_USERCONFIG = ".github/.npmrc"
  }
}

action "compile with min TS" {
  uses = "actions/npm@v2.0.0"
  needs = ["install min TS"]
  args = "run compile"
}

action "compile with latest TS" {
  uses = "actions/npm@v2.0.0"
  needs = ["install latest TS"]
  args = "run compile"
}

action "lint" {
  uses = "actions/npm@v2.0.0"
  needs = ["install latest TS"]
  args = "run lint"
}

action "compile tests" {
  uses = "actions/npm@v2.0.0"
  needs = ["compile with latest TS", "lint"]
  args = "run compile-tests"
}

action "test" {
  uses = "actions/npm@v2.0.0"
  needs = ["compile tests"]
  args = "test"
}

action "generate dts" {
  uses = "actions/npm@v2.0.0"
  needs = ["compile tests"]
  args = "run bundle-dts"
}

action "tag" {
  needs = ["test", "generate dts", "compile with min TS"]
  uses = "actions/bin/filter@master"
  args = "tag v*"
}

action "publish" {
  uses = "actions/npm@v2.0.0"
  needs = ["tag"]
  args = "publish --access public"
}
