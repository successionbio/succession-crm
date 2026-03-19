import { transformEnumValue } from 'src/engine/utils/transform-enum-value';

describe('transformEnumValue', () => {
  it('should return undefined when options is undefined', () => {
    expect(transformEnumValue(undefined)).toBeUndefined();
  });

  it('should prefix option values starting with a digit', () => {
    const options = [
      { value: '1_OPTION', label: 'Option 1', color: 'green' as const },
      { value: 'OPTION_2', label: 'Option 2', color: 'blue' as const },
    ];

    const result = transformEnumValue(options);

    expect(result).toEqual([
      { value: '_1_OPTION', label: 'Option 1', color: 'green' },
      { value: 'OPTION_2', label: 'Option 2', color: 'blue' },
    ]);
  });

  it('should parse and transform options passed as a JSON string', () => {
    const options = JSON.stringify([
      { value: 'STARTUP', label: 'Startup', color: 'green' },
      { value: 'SME', label: 'SME', color: 'turquoise' },
    ]);

    const result = transformEnumValue(options);

    expect(result).toEqual([
      { value: 'STARTUP', label: 'Startup', color: 'green' },
      { value: 'SME', label: 'SME', color: 'turquoise' },
    ]);
  });

  it('should prefix digit-starting values in JSON string options', () => {
    const options = JSON.stringify([
      { value: '3RD_PARTY', label: '3rd Party', color: 'red' },
    ]);

    const result = transformEnumValue(options);

    expect(result).toEqual([
      { value: '_3RD_PARTY', label: '3rd Party', color: 'red' },
    ]);
  });

  it('should return options unchanged when no values start with a digit', () => {
    const options = [
      { value: 'STARTUP', label: 'Startup', color: 'green' as const },
    ];

    const result = transformEnumValue(options);

    expect(result).toEqual([
      { value: 'STARTUP', label: 'Startup', color: 'green' },
    ]);
  });
});
