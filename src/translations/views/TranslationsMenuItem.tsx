// @ts-strict-ignore
import {
  LanguageCodeEnum,
  useMenuItemTranslationDetailsQuery,
  useUpdateMenuItemTranslationsMutation,
} from "@dashboard/graphql";
import useNavigator from "@dashboard/hooks/useNavigator";
import useNotifier from "@dashboard/hooks/useNotifier";
import useShop from "@dashboard/hooks/useShop";
import { commonMessages } from "@dashboard/intl";
import { extractMutationErrors } from "@dashboard/misc";
import { stringifyQs } from "@dashboard/utils/urls";
import { OutputData } from "@editorjs/editorjs";
import React from "react";
import { useIntl } from "react-intl";

import TranslationsMenuItemPage from "../components/TranslationsMenuItemPage";
import { TranslationField, TranslationInputFieldName } from "../types";
import { getParsedTranslationInputData } from "../utils";

export interface TranslationsMenuItemQueryParams {
  activeField: string;
}
export interface TranslationsMenuItemProps {
  id: string;
  languageCode: LanguageCodeEnum;
  params: TranslationsMenuItemQueryParams;
}

const TranslationsMenuItem: React.FC<TranslationsMenuItemProps> = ({
  id,
  languageCode,
  params,
}) => {
  const navigate = useNavigator();
  const notify = useNotifier();
  const shop = useShop();
  const intl = useIntl();
  const menuItemTranslations = useMenuItemTranslationDetailsQuery({
    variables: { id, language: languageCode },
  });
  const [updateTranslations, updateTranslationsOpts] = useUpdateMenuItemTranslationsMutation({
    onCompleted: data => {
      if ((data.menuItemTranslate?.errors ?? []).length === 0) {
        menuItemTranslations.refetch();
        notify({
          status: "success",
          text: intl.formatMessage(commonMessages.savedChanges),
        });
        navigate("?", { replace: true });
      }
    },
  });
  const onEdit = (field: string) =>
    navigate(
      "?" +
        stringifyQs({
          activeField: field,
        }),
      { replace: true },
    );
  const onDiscard = () => {
    navigate("?", { replace: true });
  };
  const handleSubmit = (
    { name: fieldName }: TranslationField<TranslationInputFieldName>,
    data: string | OutputData,
  ) =>
    extractMutationErrors(
      updateTranslations({
        variables: {
          id,
          input: getParsedTranslationInputData({ fieldName, data }),
          language: languageCode,
        },
      }),
    );
  const translation = menuItemTranslations?.data?.translation;

  return (
    <TranslationsMenuItemPage
      translationId={id}
      activeField={params.activeField}
      disabled={menuItemTranslations.loading || updateTranslationsOpts.loading}
      languages={shop?.languages || []}
      languageCode={languageCode}
      saveButtonState={updateTranslationsOpts.status}
      onEdit={onEdit}
      onDiscard={onDiscard}
      onSubmit={handleSubmit}
      data={translation?.__typename === "MenuItemTranslatableContent" ? translation : null}
    />
  );
};

TranslationsMenuItem.displayName = "TranslationsMenuItem";
export default TranslationsMenuItem;
