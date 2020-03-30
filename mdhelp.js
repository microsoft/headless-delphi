exports.mdText = `# Markdown sample
## (Use "show raw" below to see how it works.)
### There are 6 possible levels of headings, but you get the idea...

Lorem ipsum dolor sit amet

## Horizontal Rules

---

## Math

A big subset of LaTeX works inside \`$...$\` or \`$$...$$\` via
[KaTeX](https://katex.org/docs/supported.html), both as 
inline $\\int_0^1 x \\left[ \\cos^2(x) + \\sin^2(x) \\right]dx = {1\\over 2}$ 
and display:
$$\\lim_{x\\downarrow 0}\\, x\\ln x = 0$$

## Emphasis

**Bold**, _italic_, ~~strikethrough~~

## Blockquotes

> Blockquotes can be nested...
>> ...by using additional greater-than 
>> signs right next to each other...
> > > ...or with spaces between.

## Lists

Unordered

+ Create a list by starting a line with \`+\`, \`-\`, or \`*\`
+ Sub-lists are made by indenting 2 spaces:
  - Marker character change forces new list start:
    * Ac tristique libero volutpat at
    + Facilisis in pretium nisl aliquet
    - Nulla volutpat aliquam velit
+ Very easy!

Ordered

1. Lorem ipsum dolor sit amet
2. Consectetur adipiscing elit
3. Integer molestie lorem at massa


1. You can use sequential numbers...
1. ...or keep all the numbers as \`1.\`

Start numbering with offset:

57. foo
1. bar

## Code

Inline \`code\`, or block code fences:

\`\`\`
var foo = function (bar) {
  return bar++;
};

console.log(foo(5));
\`\`\`

## Tables

| Option | Description |
| ------ | ----------- |
| data | path to data files to supply the data that will be passed into templates. |
| engine | engine to be used for processing templates. Handlebars is the default. |
| ext | extension to be used for dest files. |

Right aligned columns

| Option | Description |
| ------:| -----------:|
| data | path to data files to supply the data that will be passed into templates. |
| engine | engine to be used for processing templates. Handlebars is the default. |
| ext | extension to be used for dest files. |


## Links

[link text](http://dev.nodeca.com)

[link with title](http://nodeca.github.io/pica/demo/ "title text!")


## Images

![Galena](https://upload.wikimedia.org/wikipedia/commons/9/92/Calcite-Galena-elm56c.jpg)

You can also specify the image link later in the document:
\`\`\`
![Galena][galena]

[galena]: https://upload.wikimedia.org/wikipedia/commons/9/92/Calcite-Galena-elm56c.jpg
\`\`\`

#### Thanks to markdown-it and KaTeX

This demo post is adapted from the 
[Markdown-it demo](https://markdown-it.github.io) 
to add KaTeX and remove features that aren't enabled here.
`;

// console.log(exports.mdText);