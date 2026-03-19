import { type FieldMetadataDefaultOption } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

export function transformEnumValue(
  options?: FieldMetadataDefaultOption[] | string,
) {
  if (!options) {
    return options;
  }

  const parsedOptions =
    typeof options === 'string' ? JSON.parse(options) : options;

  if (!Array.isArray(parsedOptions)) {
    return parsedOptions;
  }

  return parsedOptions.map((option: FieldMetadataDefaultOption) => {
    if (/^\d/.test(option.value)) {
      return {
        ...option,
        value: `_${option.value}`,
      };
    }

    return option;
  });
}
