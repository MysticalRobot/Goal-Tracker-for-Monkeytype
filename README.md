# Goal Tracker for Monkeytype

A tool that helps users reach their daily typing goals on Monkeytype. This project is not affiliated with Monkeytype.

![Preview](previews/preview.png "preview")

---

## Development Setup

- Install [Bun](https://bun.com/), this project's build tool and package manager. 
    - The version this project uses is `v1.3.5`
- Install [Typescript](https://www.typescriptlang.org/) and [Web-ext](https://github.com/mozilla/web-ext) as development dependencies with: `bun i`
    - Versions details can be found in `bun.lock` and `package.json`
- This project does not have any other known build environment requirements
- This project was developed on a 2017 MacBook Air with the following specs:
    - OS: macOS Monterey, version 12.7.6
    - Processor: 1.8 GHz Dual-Core Intel Core i5
    - Memory: 8 GB 1600 MHz DDR3
    - Graphics: Intel HD Graphics 6000 1536 MB
- Lint the project's Manifest V3, `manifest.json`, with: `web-ext lint`
- Build the project with: `bun run build`
    - The build output can be found in `dist/`
    - A `.zip` file encapsulating the extension can be found in `web-ext-artifacts/`
- Run the project using Firefox, with devtools enabled, with: `bun run dev`
    - To run the project using a Firefox fork, see `package.json` for an example script for Zen 

## Credits

- `icon.svg`: made by Je m'apple (me)

## License

- MIT, find details [here](LICENSE.md)


