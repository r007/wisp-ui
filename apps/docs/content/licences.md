---

title: Licences and credits
description: Wisp is Apache-2.0. These are the notices for the work it builds on.
section: Project
order: 99
---

Wisp's own code is licensed under the [Apache License 2.0](https://github.com/r007/wisp-ui/blob/main/LICENSE). Copyright 2026 Sergey Monin and Wisp contributors.

It adapts and includes the work below. Each adapted source file says where it came from and what changed. The full notices are in the repository's [NOTICE](https://github.com/r007/wisp-ui/blob/main/NOTICE) and [THIRD_PARTY_LICENSES.md](https://github.com/r007/wisp-ui/blob/main/THIRD_PARTY_LICENSES.md).

## Design token data, and the shape algorithms

**Source:** the `material_ui` package of [flutter/packages](https://github.com/flutter/packages). **Copyright 2013 The Flutter Authors.** BSD 3-Clause licence.

The design token data in `tools/codegen/data/tokens.json` is derived from it, and records the repository, commit and release it came from. The shape toolkit (`packages/react/src/shapes`: rounded polygons, curve and feature measuring, feature mapping, the morph, and the numbers that define the catalogue of thirty-five shapes) is a TypeScript port of its code, with its tests.

```text
Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above
      copyright notice, this list of conditions and the following
      disclaimer in the documentation and/or other materials provided
      with the distribution.
    * Neither the name of Google Inc. nor the names of its
      contributors may be used to endorse or promote products derived
      from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

That Dart code is itself a port of the AndroidX `graphics-shapes` library and of a shape catalogue, **Copyright 2022 and 2023 The Android Open Source Project**, licensed under the Apache License 2.0.

## Press ripple and elevation

Parts of the press ripple and of the elevation shadows are adapted from [material-web](https://github.com/material-components/material-web), **Copyright 2022 Google LLC**, under the Apache License 2.0. The files say which parts, and what changed.

## Dependencies

`@wisp-ui/tokens` depends on [`@material/material-color-utilities`](https://github.com/material-foundation/material-color-utilities) (Apache-2.0) to generate palettes from a seed colour. React is a peer dependency. The documentation and Storybook also use Roboto (Apache-2.0 and OFL, through Fontsource) and an icon set (Apache-2.0); neither is part of the published packages, which take icons as React nodes and use whatever fonts your app loads.

## Independence

Wisp is an independent project. It is not affiliated with, sponsored by, or endorsed by Google. Material Design is a trademark of Google LLC; it is named here only to say whose work is credited above.
