import { FetchResult } from "@apollo/client";
import { AttributeInput, AttributeInputData } from "@dashboard/components/Attributes";
import {
  AttributeEntityTypeEnum,
  AttributeErrorFragment,
  AttributeFragment,
  AttributeInputTypeEnum,
  AttributeValueDeleteMutation,
  AttributeValueFragment,
  AttributeValueInput,
  FileUploadMutation,
  Node,
  PageSelectedAttributeFragment,
  ProductFragment,
  SearchCategoriesQuery,
  SearchCollectionsQuery,
  SearchPagesQuery,
  SearchProductsQuery,
  SelectedVariantAttributeFragment,
  UploadErrorFragment,
} from "@dashboard/graphql";
import { FormsetData } from "@dashboard/hooks/useFormset";
import { RelayToFlat } from "@dashboard/types";
import { mapEdgesToItems, mapNodeToChoice, mapPagesToChoices } from "@dashboard/utils/maps";
import { RichTextContextValues } from "@dashboard/utils/richText/context";
import { GetRichTextValues, RichTextGetters } from "@dashboard/utils/richText/useMultipleRichText";

import { AttributePageFormData } from "../components/AttributePage";

type AtributesOfFiles = Pick<AttributeValueInput, "file" | "id" | "values" | "contentType">;

export interface RichTextProps {
  richText: RichTextContextValues;
  attributeRichTextGetters: RichTextGetters<string>;
}

export const ATTRIBUTE_TYPES_WITH_DEDICATED_VALUES = [
  AttributeInputTypeEnum.DROPDOWN,
  AttributeInputTypeEnum.MULTISELECT,
  AttributeInputTypeEnum.SWATCH,
];

export const ATTRIBUTE_TYPES_WITH_CONFIGURABLE_FACED_NAVIGATION = [
  AttributeInputTypeEnum.DROPDOWN,
  AttributeInputTypeEnum.MULTISELECT,
  AttributeInputTypeEnum.BOOLEAN,
  AttributeInputTypeEnum.DATE,
  AttributeInputTypeEnum.DATE_TIME,
  AttributeInputTypeEnum.NUMERIC,
  AttributeInputTypeEnum.SWATCH,
];

export function filterable(attribute: Pick<AttributeFragment, "inputType">): boolean {
  return ATTRIBUTE_TYPES_WITH_CONFIGURABLE_FACED_NAVIGATION.includes(attribute.inputType!);
}

export interface AttributeReference {
  label: string;
  value: string;
}

export interface AttributeValueEditDialogFormData {
  name: string;
  value?: string;
  fileUrl?: string;
  contentType?: string;
}

export function attributeValueFragmentToFormData(
  data: AttributeValueFragment | null,
): AttributeValueEditDialogFormData {
  return {
    name: data?.name ?? "",
    value: data?.value ?? "",
    contentType: data?.file?.contentType ?? "",
    fileUrl: data?.file?.url,
  };
}

function getSimpleAttributeData(
  data: AttributePageFormData,
  values: AttributeValueEditDialogFormData[],
) {
  return {
    ...data,
    metadata: undefined,
    privateMetadata: undefined,
    storefrontSearchPosition: parseInt(data.storefrontSearchPosition, 10),
    values: values.map(value => ({
      name: value.name,
    })),
  };
}

function getAttributeValueTypeFields({
  fileUrl,
  value,
  name,
  contentType,
}: AttributeValueEditDialogFormData) {
  return {
    name,
    ...(fileUrl ? { fileUrl, contentType } : { value }),
  };
}

function getSwatchAttributeData(
  data: AttributePageFormData,
  values: AttributeValueEditDialogFormData[],
) {
  return {
    ...data,
    metadata: undefined,
    privateMetadata: undefined,
    storefrontSearchPosition: parseInt(data.storefrontSearchPosition, 10),
    values: values.map(getAttributeValueTypeFields),
  };
}

function getFileOrReferenceAttributeData(
  data: AttributePageFormData,
  values: AttributeValueEditDialogFormData[],
) {
  return {
    ...getSimpleAttributeData(data, values),
    values: [],
    availableInGrid: undefined,
    filterableInDashboard: undefined,
    filterableInStorefront: undefined,
  };
}

export function getAttributeData(
  data: AttributePageFormData,
  values: AttributeValueEditDialogFormData[],
) {
  if (data.inputType === AttributeInputTypeEnum.SWATCH) {
    return getSwatchAttributeData(data, values);
  } else if (ATTRIBUTE_TYPES_WITH_DEDICATED_VALUES.includes(data.inputType)) {
    return getSimpleAttributeData(data, values);
  } else {
    return getFileOrReferenceAttributeData(data, values);
  }
}

export function getSelectedAttributeValues(
  attribute:
    | PageSelectedAttributeFragment
    | ProductFragment["attributes"][0]
    | SelectedVariantAttributeFragment,
) {
  switch (attribute.attribute.inputType) {
    case AttributeInputTypeEnum.REFERENCE:
      return attribute.values.map(value => value.reference);

    case AttributeInputTypeEnum.PLAIN_TEXT:
      return [attribute.values[0]?.plainText];

    case AttributeInputTypeEnum.RICH_TEXT:
      return [attribute.values[0]?.richText];

    case AttributeInputTypeEnum.NUMERIC:
      return [attribute.values[0]?.name];

    case AttributeInputTypeEnum.BOOLEAN:
      return [attribute.values[0]?.boolean];

    case AttributeInputTypeEnum.DATE:
      return [attribute.values[0]?.date];

    case AttributeInputTypeEnum.DATE_TIME:
      return [attribute.values[0]?.dateTime];

    default:
      return attribute.values.map(value => value.slug);
  }
}

export const isFileValueUnused = (
  attributesWithNewFileValue: FormsetData<null, File>,
  existingAttribute:
    | PageSelectedAttributeFragment
    | ProductFragment["attributes"][0]
    | SelectedVariantAttributeFragment,
) => {
  if (existingAttribute.attribute.inputType !== AttributeInputTypeEnum.FILE) {
    return false;
  }

  if (existingAttribute.values.length === 0) {
    return false;
  }

  const modifiedAttribute = attributesWithNewFileValue.find(
    dataAttribute => dataAttribute.id === existingAttribute.attribute.id,
  );

  return !!modifiedAttribute;
};

export const mergeFileUploadErrors = (
  uploadFilesResult: Array<FetchResult<FileUploadMutation>>,
): UploadErrorFragment[] =>
  uploadFilesResult.reduce((errors, uploadFileResult) => {
    const uploadErrors = uploadFileResult?.data?.fileUpload?.errors;

    if (uploadErrors) {
      return [...errors, ...uploadErrors];
    }

    return errors;
  }, [] as UploadErrorFragment[]);

export const mergeAttributeValueDeleteErrors = (
  deleteAttributeValuesResult: Array<FetchResult<AttributeValueDeleteMutation>>,
): AttributeErrorFragment[] =>
  deleteAttributeValuesResult.reduce((errors, deleteValueResult) => {
    const deleteErrors = deleteValueResult?.data?.attributeValueDelete?.errors;

    if (deleteErrors) {
      return [...errors, ...deleteErrors];
    }

    return errors;
  }, [] as AttributeErrorFragment[]);

export const mergeChoicesWithValues = (
  attribute:
    | ProductFragment["attributes"][0]
    | PageSelectedAttributeFragment
    | SelectedVariantAttributeFragment,
) => {
  const choices = mapEdgesToItems(attribute.attribute.choices) || [];
  const valuesToConcat = attribute.values.filter(
    value => !choices.some(choice => choice.id === value.id),
  );

  return choices.concat(valuesToConcat);
};

export const mergeAttributeValues = (
  attributeId: string,
  attributeValues: string[],
  attributes: FormsetData<AttributeInputData, string[]>,
) => {
  const attribute = attributes.find(attribute => attribute.id === attributeId);

  return attribute?.value ? [...attribute.value, ...attributeValues] : attributeValues;
};

export const mergeAttributes = (...attributeLists: AttributeInput[][]): AttributeInput[] =>
  attributeLists.reduce((prev, attributes) => {
    const newAttributeIds = new Set(attributes.map(attr => attr.id));

    return [...prev.filter(attr => !newAttributeIds.has(attr.id)), ...attributes];
  }, []);

export function getRichTextAttributesFromMap(
  attributes: AttributeInput[],
  values: GetRichTextValues,
): AttributeInput[] {
  return attributes
    .filter(({ data }) => data.inputType === AttributeInputTypeEnum.RICH_TEXT)
    .map(attribute => ({
      ...attribute,
      value: [JSON.stringify(values[attribute.id])],
    }));
}

export function getRichTextDataFromAttributes(
  attributes: AttributeInput[] = [],
): Record<string, string> {
  const keyValuePairs = attributes
    .filter(attribute => attribute.data.inputType === AttributeInputTypeEnum.RICH_TEXT)
    .map(attribute => [attribute.id, attribute.value[0]]);

  return Object.fromEntries(keyValuePairs);
}

export const getFileValuesToUploadFromAttributes = (
  attributesWithNewFileValue: FormsetData<null, File>,
) => attributesWithNewFileValue.filter(fileAttribute => !!fileAttribute.value);

export const getFileValuesRemovedFromAttributes = (
  attributesWithNewFileValue: FormsetData<null, File>,
) => attributesWithNewFileValue.filter(attribute => !attribute.value);

export const getAttributesOfRemovedFiles = (
  fileAttributesRemoved: FormsetData<null, File>,
): AtributesOfFiles[] =>
  fileAttributesRemoved.map(attribute => ({
    file: undefined,
    id: attribute.id,
    contentType: attribute.value?.type,
    values: [],
  }));

export const getAttributesOfUploadedFiles = (
  fileValuesToUpload: FormsetData<null, File>,
  uploadFilesResult: Array<FetchResult<FileUploadMutation>>,
): AtributesOfFiles[] =>
  uploadFilesResult.map((uploadFileResult, index) => {
    const attribute = fileValuesToUpload[index];

    return {
      file: uploadFileResult.data?.fileUpload?.uploadedFile?.url,
      contentType: uploadFileResult.data?.fileUpload?.uploadedFile?.contentType,
      id: attribute.id,
      values: [],
    };
  });

export const getAttributesAfterFileAttributesUpdate = (
  attributesWithNewFileValue: FormsetData<null, File>,
  uploadFilesResult: Array<FetchResult<FileUploadMutation>>,
): AttributeValueInput[] => {
  const removedFileValues = getFileValuesRemovedFromAttributes(attributesWithNewFileValue);
  const fileValuesToUpload = getFileValuesToUploadFromAttributes(attributesWithNewFileValue);
  const removedFileAttributes = getAttributesOfRemovedFiles(removedFileValues);
  const uploadedFileAttributes = getAttributesOfUploadedFiles(
    fileValuesToUpload,
    uploadFilesResult,
  );

  return uploadedFileAttributes.concat(removedFileAttributes);
};

export const getFileAttributeDisplayData = (
  attribute: AttributeInput,
  attributesWithNewFileValue: FormsetData<null, File>,
) => {
  const attributeWithNewFileValue = attributesWithNewFileValue.find(
    attributeWithNewFile => attribute.id === attributeWithNewFile.id,
  );

  if (attributeWithNewFileValue) {
    return {
      ...attribute,
      value: attributeWithNewFileValue?.value?.name ? [attributeWithNewFileValue.value.name] : [],
    };
  }

  return attribute;
};

export const getPageReferenceAttributeDisplayData = (
  attribute: AttributeInput,
  referencePages: RelayToFlat<NonNullable<SearchPagesQuery["search"]>>,
) => ({
  ...attribute,
  data: {
    ...attribute.data,
    references:
      referencePages?.length > 0 && attribute.value?.length > 0
        ? mapPagesToChoices(
            attribute.value.reduce<RelayToFlat<NonNullable<SearchPagesQuery["search"]>>>(
              (acc, value) => {
                const reference = referencePages.find(reference => reference.id === value);

                if (reference) {
                  acc.push(reference);
                }

                return acc;
              },
              [],
            ),
          )
        : [],
  },
});

export const getProductReferenceAttributeDisplayData = (
  attribute: AttributeInput,
  referenceProducts: RelayToFlat<NonNullable<SearchProductsQuery["search"]>>,
) => ({
  ...attribute,
  data: {
    ...attribute.data,
    references:
      referenceProducts?.length > 0 && attribute.value?.length > 0
        ? mapNodeToChoice(
            attribute.value.reduce<RelayToFlat<NonNullable<SearchProductsQuery["search"]>>>(
              (acc, value) => {
                const reference = referenceProducts.find(reference => reference.id === value);

                if (reference) {
                  acc.push(reference);
                }

                return acc;
              },
              [],
            ),
          )
        : [],
  },
});

export const getProductVariantReferenceAttributeDisplayData = (
  attribute: AttributeInput,
  referenceProducts: RelayToFlat<NonNullable<SearchProductsQuery["search"]>>,
) => ({
  ...attribute,
  data: {
    ...attribute.data,
    references:
      referenceProducts?.length > 0 && attribute.value?.length > 0
        ? mapNodeToChoice(
            attribute.value.reduce<Array<Node & Record<"name", string>>>((acc, value) => {
              const reference = mapReferenceProductsToVariants(referenceProducts).find(
                reference => reference.id === value,
              );

              if (reference) {
                acc.push(reference);
              }

              return acc;
            }, []),
          )
        : [],
  },
});

export const getCollectionReferenceAttributeDisplayData = (
  attribute: AttributeInput,
  referenceCollections: RelayToFlat<NonNullable<SearchCollectionsQuery["search"]>>,
) => ({
  ...attribute,
  data: {
    ...attribute.data,
    references:
      referenceCollections?.length > 0 && attribute.value?.length > 0
        ? mapNodeToChoice(
            attribute.value.reduce<RelayToFlat<NonNullable<SearchCollectionsQuery["search"]>>>(
              (acc, value) => {
                const reference = referenceCollections.find(reference => reference.id === value);

                if (reference) {
                  acc.push(reference);
                }

                return acc;
              },
              [],
            ),
          )
        : [],
  },
});

export const getCategoryReferenceAttributeDisplayData = (
  attribute: AttributeInput,
  referenceCategories: RelayToFlat<NonNullable<SearchCategoriesQuery["search"]>>,
) => ({
  ...attribute,
  data: {
    ...attribute.data,
    references:
      referenceCategories?.length > 0 && attribute.value?.length > 0
        ? mapNodeToChoice(
            attribute.value.reduce<RelayToFlat<NonNullable<SearchCategoriesQuery["search"]>>>(
              (acc, value) => {
                const reference = referenceCategories.find(reference => reference.id === value);

                if (reference) {
                  acc.push(reference);
                }

                return acc;
              },
              [],
            ),
          )
        : [],
  },
});

export const getReferenceAttributeDisplayData = (
  attribute: AttributeInput,
  referencePages: RelayToFlat<NonNullable<SearchPagesQuery["search"]>>,
  referenceProducts: RelayToFlat<NonNullable<SearchProductsQuery["search"]>>,
  referenceCollections: RelayToFlat<NonNullable<SearchCollectionsQuery["search"]>>,
  referenceCategories: RelayToFlat<NonNullable<SearchCategoriesQuery["search"]>>,
) => {
  if (attribute.data.entityType === AttributeEntityTypeEnum.PAGE) {
    return getPageReferenceAttributeDisplayData(attribute, referencePages);
  } else if (attribute.data.entityType === AttributeEntityTypeEnum.PRODUCT) {
    return getProductReferenceAttributeDisplayData(attribute, referenceProducts);
  } else if (attribute.data.entityType === AttributeEntityTypeEnum.PRODUCT_VARIANT) {
    return getProductVariantReferenceAttributeDisplayData(attribute, referenceProducts);
  } else if (attribute.data.entityType === AttributeEntityTypeEnum.COLLECTION) {
    return getCollectionReferenceAttributeDisplayData(attribute, referenceCollections);
  } else if (attribute.data.entityType === AttributeEntityTypeEnum.CATEGORY) {
    return getCategoryReferenceAttributeDisplayData(attribute, referenceCategories);
  }
};

export const getAttributesDisplayData = (
  attributes: AttributeInput[],
  attributesWithNewFileValue: FormsetData<null, File>,
  referencePages: RelayToFlat<NonNullable<SearchPagesQuery["search"]>>,
  referenceProducts: RelayToFlat<NonNullable<SearchProductsQuery["search"]>>,
  referenceCollections: RelayToFlat<NonNullable<SearchCollectionsQuery["search"]>>,
  referenceCategories: RelayToFlat<NonNullable<SearchCategoriesQuery["search"]>>,
) =>
  attributes.map(attribute => {
    if (attribute.data.inputType === AttributeInputTypeEnum.REFERENCE) {
      return getReferenceAttributeDisplayData(
        attribute,
        referencePages,
        referenceProducts,
        referenceCollections,
        referenceCategories,
      );
    }

    if (attribute.data.inputType === AttributeInputTypeEnum.FILE) {
      return getFileAttributeDisplayData(attribute, attributesWithNewFileValue);
    }

    return attribute;
  });

export const getReferenceAttributeEntityTypeFromAttribute = (
  attributeId: string,
  attributes?: AttributeInput[],
): AttributeEntityTypeEnum | undefined => {
  return attributes?.find(attribute => attribute.id === attributeId)?.data?.entityType;
};

export const mapReferenceProductsToVariants = (
  referenceProducts: RelayToFlat<NonNullable<SearchProductsQuery["search"]>>,
) =>
  referenceProducts.flatMap(product =>
    (product.variants || []).map(variant => ({
      ...variant,
      name: `${product.name} ${variant.name}`,
    })),
  );
