# Third-party licences

Wisp's own code is licensed under the Apache License 2.0 (see `LICENSE`). It
incorporates the following third-party material. See `NOTICE` for what is used
and where.

## flutter/packages (token data, shape algorithms and their tests)

Source: <https://github.com/flutter/packages>, `packages/material_ui`

```
Copyright 2013 The Flutter Authors

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

## AndroidX graphics-shapes

Source: <https://android.googlesource.com/platform/frameworks/support/+/refs/heads/androidx-main/graphics/graphics-shapes/>

Licensed under the Apache License, Version 2.0, the same licence as this project; the full
text is in `LICENSE`. Copyright 2022 The Android Open Source Project. Reached through
Flutter's Dart port (above), from which Wisp's TypeScript port was made.

## Material Web

Source: <https://github.com/material-components/material-web>

Licensed under the Apache License, Version 2.0, the same licence as this
project; the full text is in `LICENSE`. Copyright 2022 Google LLC.

## Development-only dependencies

Storybook uses [Material Symbols](https://github.com/marella/material-symbols)
(Apache-2.0) for demo icons and [Roboto](https://fonts.google.com/specimen/Roboto)
via Fontsource (Apache-2.0 / OFL) for text. Neither is included in the published
packages, which take icons as React children and use whatever fonts the app loads.
