# Craft Content

![Lint](https://github.com/husky-dev/craft-content/workflows/Lint/badge.svg)
![Test](https://github.com/husky-dev/craft-content/workflows/Test/badge.svg)

Craft Content is a CLI tool designed to generate [Hugo](https://gohugo.io/) website content from markdown files exported from the [Craft](https://www.craft.do/) application.

Certainly! Here's a draft of the `README.md` for your Craft Content CLI tool:

## Installation

Using npm:

Install the Craft Content CLI tool globally using npm:

```bash
npm install craft-content -g
```

Using npx:

If you don't want to install the CLI tool globally, you can use it directly with `npx`:

```bash
npx craft-content [options]
```

**Note**: When using `npx`, ensure that you have `npx` installed. It comes bundled with `npm` v5.2.0 and higher.

## Usage

To convert markdown files exported from Craft into Hugo content:

```bash
craft-content --src <source_directory> --dist <destination_directory>
```

Example:

```bash
craft-content --src ./my-craft-exports --dist ./my-hugo-site/content
```

## Options

| Option             | Description                                                           | Default Value |
|--------------------|-----------------------------------------------------------------------|---------------|
| `-v, --version`    | Output the current version                                            |               |
| `-s, --src <src>`  | Define the source folder where Craft markdown exports are located     | "craft"       |
| `-d, --dist <dist>`| Define the destination folder for the Hugo content                    | "content"     |
| `-c, --cache <cache>` | Define the cache folder                                           | ".cache"      |
| `--debug`          | Output extra debugging information                                    |               |
| `-h, --help`       | Display help for the command                                          |               |

## Contacts

Jaroslav Khorishchenko

[hello@husky-dev.me](mailto:hello@husky-dev.me)
