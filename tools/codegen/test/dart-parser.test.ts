import { describe, expect, it } from 'vitest';
import { argbToCssHex, parseDartTokenFile } from '../src/dart-parser.ts';

const header = `// Version: 1.2.3\n// dart format off\n`;

describe('parseDartTokenFile', () => {
  it('parses doubles, strings and hex colours', () => {
    const file = parseDartTokenFile(
      `${header}class TokenX {
  /// md.sys.state.hover.state-layer-opacity
  static const double hover = 0.08;

  /// md.ref.typeface.plain
  static const String plain = 'Roboto';

  /// md.sys.color.primary
  static const String primary = '0xFF6750A4';
}`,
      'x.dart',
    );
    expect(file.version).toBe('1.2.3');
    expect(file.tokens).toEqual([
      { name: 'md.sys.state.hover.state-layer-opacity', value: { type: 'number', value: 0.08 } },
      { name: 'md.ref.typeface.plain', value: { type: 'string', value: 'Roboto' } },
      { name: 'md.sys.color.primary', value: { type: 'hex', value: '#6750a4' } },
    ]);
  });

  it('copes with `dart format` wrapping the type, identifier and value', () => {
    const file = parseDartTokenFile(
      `${header}class TokenX {
  /// md.comp.a.very.long.token.name.color
  static const TokenColorRole
  aVeryLongTokenNameColor =
      TokenColorRole.onPrimary;
}`,
      'x.dart',
    );
    expect(file.tokens).toEqual([
      {
        name: 'md.comp.a.very.long.token.name.color',
        value: { type: 'dart-ref', owner: 'TokenColorRole', member: 'onPrimary' },
      },
    ]);
  });

  it('orders shape corners as CSS does (tl, tr, br, bl)', () => {
    const file = parseDartTokenFile(
      `${header}class TokenX {
  /// md.sys.shape.corner.large.top
  static const ShapeStruct cornerLargeTop = ShapeStruct(
    family: 'SHAPE_FAMILY_ROUNDED_CORNERS',
    topLeft: 16.00,
    topRight: 17.00,
    bottomLeft: 19.00,
    bottomRight: 18.00,
  );
}`,
      'x.dart',
    );
    expect(file.tokens[0]?.value).toEqual({
      type: 'shape',
      family: 'rounded',
      corners: [16, 17, 18, 19],
    });
  });

  it('parses typescale, duration and cubic structs', () => {
    const file = parseDartTokenFile(
      `${header}class TokenX {
  /// md.sys.typescale.emphasized.body-large
  static const TypescaleStruct bodyLarge = TypescaleStruct(
    name: 'emphasized.body-large',
    fontFamily: 'Roboto',
    fontSize: 16.00,
    fontWeight: 500,
    lineHeight: 24.00,
    letterSpacing: 0.50,
  );

  /// md.sys.motion.duration.short1
  static const Duration short1 = Duration(milliseconds: 50);

  /// md.sys.motion.easing.standard
  static const CubicStruct standard = CubicStruct(a: 0.20, b: 0.00, c: 0.00, d: 1.00);
}`,
      'x.dart',
    );
    expect(file.tokens.map((t) => t.value)).toEqual([
      { type: 'typescale', font: 'Roboto', size: 16, weight: 500, lineHeight: 24, tracking: 0.5 },
      { type: 'duration', ms: 50 },
      { type: 'cubic-bezier', points: [0.2, 0, 0, 1] },
    ]);
  });

  it('records enum members with their owner', () => {
    const file = parseDartTokenFile(
      `${header}enum TokenColorRole {
  /// md.sys.color.on-primary
  onPrimary,

  /// md.sys.color.error
  error,
}`,
      'color_role.dart',
    );
    expect(file.enumMembers).toEqual([
      { owner: 'TokenColorRole', member: 'onPrimary', name: 'md.sys.color.on-primary' },
      { owner: 'TokenColorRole', member: 'error', name: 'md.sys.color.error' },
    ]);
  });

  it('does not end an expression at a semicolon inside a string', () => {
    const file = parseDartTokenFile(
      `${header}class TokenX {
  /// md.ref.typeface.odd
  static const String odd = 'a;b';
}`,
      'x.dart',
    );
    expect(file.tokens[0]?.value).toEqual({ type: 'string', value: 'a;b' });
  });

  it('fails loudly on shapes it does not understand', () => {
    expect(() =>
      parseDartTokenFile(
        `${header}class TokenX {\n  /// md.a.b\n  static const double x = double.infinity;\n}`,
        'bad.dart',
      ),
    ).toThrow(/bad\.dart: md\.a\.b: expected a number/);

    expect(() =>
      parseDartTokenFile(
        `${header}class TokenX {\n  /// md.a.b\n  static const Offset x = Offset(1, 2);\n}`,
        'bad.dart',
      ),
    ).toThrow(/unsupported Dart type "Offset"/);
  });

  it('fails on an unterminated declaration', () => {
    expect(() =>
      parseDartTokenFile(
        `${header}class TokenX {\n  /// md.a.b\n  static const double x = 1.0`,
        'bad.dart',
      ),
    ).toThrow(/unterminated declaration/);
  });
});

describe('argbToCssHex', () => {
  it('drops an opaque alpha channel and keeps a translucent one', () => {
    expect(argbToCssHex('FF6750A4')).toBe('#6750a4');
    expect(argbToCssHex('0F000000')).toBe('#0000000f');
  });
});
