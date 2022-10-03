# Contributing Guide (briefly)

## To clone:

This project uses PNPM as a package manager. If you don't have it installed, you can install it with `npm install -g pnpm`.

```sh
# if you haven't already, install ts-node globally
# this let's us run the script with TS directly
npm install -g ts-node # or pnpm add -g ts-node

# clone the repo and cd into it

# install dependencies
pnpm install

# if you haven't installed parrot globally already
# run the CLI to init parrot with a github personall access token (see the README for more info)
ts-node bin.ts init [token]
```

Please feel free to make feature requests and contribute to the project. 🦜🥳