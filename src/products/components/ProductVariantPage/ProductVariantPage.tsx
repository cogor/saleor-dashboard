// @ts-strict-ignore
import { QueryResult } from "@apollo/client";
import {
  getReferenceAttributeEntityTypeFromAttribute,
  mergeAttributeValues,
} from "@dashboard/attributes/utils/data";
import { useUser } from "@dashboard/auth";
import { hasPermission } from "@dashboard/auth/misc";
import { ChannelPriceData } from "@dashboard/channels/utils";
import { TopNav } from "@dashboard/components/AppLayout/TopNav";
import AssignAttributeValueDialog from "@dashboard/components/AssignAttributeValueDialog";
import { Container } from "@dashboard/components/AssignContainerDialog";
import {
  AttributeInput,
  Attributes,
  VariantAttributeScope,
} from "@dashboard/components/Attributes";
import CardSpacer from "@dashboard/components/CardSpacer";
import { ConfirmButtonTransitionState } from "@dashboard/components/ConfirmButton";
import Grid from "@dashboard/components/Grid";
import { DetailPageLayout } from "@dashboard/components/Layouts";
import { MetadataFormData } from "@dashboard/components/Metadata";
import { Metadata } from "@dashboard/components/Metadata/Metadata";
import { Savebar } from "@dashboard/components/Savebar";
import {
  PermissionEnum,
  ProductChannelListingErrorFragment,
  ProductErrorWithAttributesFragment,
  ProductVariantFragment,
  SearchAttributeValuesQuery,
  SearchCategoriesQuery,
  SearchCollectionsQuery,
  SearchPagesQuery,
  SearchProductsQuery,
  SearchWarehousesQuery,
} from "@dashboard/graphql";
import useNavigator from "@dashboard/hooks/useNavigator";
import { VariantDetailsChannelsAvailabilityCard } from "@dashboard/products/components/ProductVariantChannels/ChannelsAvailabilityCard";
import { productUrl } from "@dashboard/products/urls";
import { getSelectedMedia } from "@dashboard/products/utils/data";
import { TranslationsButton } from "@dashboard/translations/components/TranslationsButton/TranslationsButton";
import { productVariantUrl } from "@dashboard/translations/urls";
import { useCachedLocales } from "@dashboard/translations/useCachedLocales";
import { FetchMoreProps, RelayToFlat, ReorderAction } from "@dashboard/types";
import { mapEdgesToItems } from "@dashboard/utils/maps";
import { Box } from "@saleor/macaw-ui-next";
import React from "react";
import { defineMessages, useIntl } from "react-intl";

import { ProductShipping } from "../ProductShipping";
import { ProductStockInput, ProductStocks } from "../ProductStocks";
import { useManageChannels } from "../ProductVariantChannels/useManageChannels";
import { VariantChannelsDialog } from "../ProductVariantChannels/VariantChannelsDialog";
import ProductVariantCheckoutSettings from "../ProductVariantCheckoutSettings/ProductVariantCheckoutSettings";
import ProductVariantEndPreorderDialog from "../ProductVariantEndPreorderDialog";
import ProductVariantMediaSelectDialog from "../ProductVariantImageSelectDialog";
import ProductVariantMedia from "../ProductVariantMedia";
import ProductVariantName from "../ProductVariantName";
import ProductVariantNavigation from "../ProductVariantNavigation";
import { ProductVariantPrice } from "../ProductVariantPrice";
import ProductVariantSetDefault from "../ProductVariantSetDefault";
import ProductVariantUpdateForm, {
  ProductVariantUpdateData,
  ProductVariantUpdateHandlers,
  ProductVariantUpdateSubmitData,
} from "./form";

const messages = defineMessages({
  nonSelectionAttributes: {
    id: "f3B4tc",
    defaultMessage: "Variant Attributes",
    description: "attributes, section header",
  },
  selectionAttributesHeader: {
    id: "o6260f",
    defaultMessage: "Variant Selection Attributes",
    description: "attributes, section header",
  },
});

export interface ProductVariantPageFormData extends MetadataFormData {
  costPrice: string;
  price: string;
  sku: string;
  trackInventory: boolean;
  weight: string;
}

export interface ProductVariantPageSubmitData extends ProductVariantPageFormData {
  attributes: AttributeInput[];
  addStocks: ProductStockInput[];
  updateStocks: ProductStockInput[];
  removeStocks: string[];
}

function byAttributeScope(scope: VariantAttributeScope) {
  return (attribute: AttributeInput) => attribute.data.variantAttributeScope === scope;
}

interface ProductVariantPageProps {
  productId: string;
  assignReferencesAttributeId?: string;
  defaultVariantId?: string;
  defaultWeightUnit: string;
  errors: ProductErrorWithAttributesFragment[];
  header: string;
  channels: ChannelPriceData[];
  channelErrors: ProductChannelListingErrorFragment[];
  loading?: boolean;
  placeholderImage?: string;
  saveButtonBarState: ConfirmButtonTransitionState;
  variant?: ProductVariantFragment;
  referencePages?: RelayToFlat<SearchPagesQuery["search"]>;
  referenceProducts?: RelayToFlat<SearchProductsQuery["search"]>;
  referenceCategories?: RelayToFlat<SearchCategoriesQuery["search"]>;
  referenceCollections?: RelayToFlat<SearchCollectionsQuery["search"]>;
  attributeValues: RelayToFlat<SearchAttributeValuesQuery["attribute"]["choices"]>;
  fetchMoreReferencePages?: FetchMoreProps;
  fetchMoreReferenceProducts?: FetchMoreProps;
  fetchMoreAttributeValues?: FetchMoreProps;
  fetchReferencePages?: (data: string) => void;
  fetchReferenceProducts?: (data: string) => void;
  fetchAttributeValues: (query: string, attributeId: string) => void;
  onAssignReferencesClick: (attribute: AttributeInput) => void;
  onCloseDialog: () => void;
  onVariantPreorderDeactivate: (id: string) => void;
  variantDeactivatePreoderButtonState: ConfirmButtonTransitionState;
  onVariantReorder: ReorderAction;
  onAttributeSelectBlur: () => void;
  onDelete: () => any;
  onSubmit: (data: ProductVariantUpdateSubmitData) => any;
  onSetDefaultVariant: () => any;
  onWarehouseConfigure: () => any;
  fetchMoreWarehouses: () => void;
  searchWarehousesResult: QueryResult<SearchWarehousesQuery>;
}

const ProductVariantPage: React.FC<ProductVariantPageProps> = ({
  productId,
  channels,
  channelErrors,
  defaultVariantId,
  defaultWeightUnit,
  errors: apiErrors,
  header,
  loading,
  placeholderImage,
  saveButtonBarState,
  variant,
  referencePages = [],
  referenceProducts = [],
  referenceCategories = [],
  referenceCollections = [],
  attributeValues,
  onDelete,
  onSubmit,
  onVariantPreorderDeactivate,
  variantDeactivatePreoderButtonState,
  onVariantReorder,
  onSetDefaultVariant,
  onWarehouseConfigure,
  assignReferencesAttributeId,
  onAssignReferencesClick,
  fetchReferencePages,
  fetchReferenceProducts,
  fetchAttributeValues,
  fetchMoreReferencePages,
  fetchMoreReferenceProducts,
  fetchMoreAttributeValues,
  onCloseDialog,
  onAttributeSelectBlur,
  fetchMoreWarehouses,
  searchWarehousesResult,
}) => {
  const intl = useIntl();
  const { user } = useUser();
  const canTranslate = user && hasPermission(PermissionEnum.MANAGE_TRANSLATIONS, user);
  const { lastUsedLocaleOrFallback } = useCachedLocales();
  const navigate = useNavigator();
  const { isOpen: isManageChannelsModalOpen, toggle: toggleManageChannels } = useManageChannels();
  const [isModalOpened, setModalStatus] = React.useState(false);
  const toggleModal = () => setModalStatus(!isModalOpened);
  const [isEndPreorderModalOpened, setIsEndPreorderModalOpened] = React.useState(false);
  const productMedia = [...(variant?.product?.media ?? [])]?.sort((prev, next) =>
    prev.sortOrder > next.sortOrder ? 1 : -1,
  );
  const canOpenAssignReferencesAttributeDialog = !!assignReferencesAttributeId;
  const handleDeactivatePreorder = async () => {
    await onVariantPreorderDeactivate(variant.id);
    setIsEndPreorderModalOpened(false);
  };
  const handleAssignReferenceAttribute = (
    attributeValues: Container[],
    data: ProductVariantUpdateData,
    handlers: ProductVariantUpdateHandlers,
  ) => {
    handlers.selectAttributeReference(
      assignReferencesAttributeId,
      mergeAttributeValues(
        assignReferencesAttributeId,
        attributeValues.map(({ id }) => id),
        data.attributes,
      ),
    );
    handlers.selectAttributeReferenceMetadata(
      assignReferencesAttributeId,
      attributeValues.map(({ name, id }) => ({ value: id, label: name })),
    );
    onCloseDialog();
  };

  return (
    <DetailPageLayout gridTemplateColumns={1}>
      <TopNav href={productUrl(productId)} title={header}>
        {variant?.product?.defaultVariant?.id !== variant?.id && (
          <Box marginRight={3}>
            <ProductVariantSetDefault onSetDefaultVariant={onSetDefaultVariant} />
          </Box>
        )}
        {canTranslate && (
          <TranslationsButton
            onClick={() =>
              navigate(productVariantUrl(lastUsedLocaleOrFallback, productId, variant?.id))
            }
          />
        )}
      </TopNav>
      <DetailPageLayout.Content>
        <ProductVariantUpdateForm
          variant={variant}
          onSubmit={onSubmit}
          currentChannels={channels}
          referencePages={referencePages}
          referenceProducts={referenceProducts}
          fetchReferencePages={fetchReferencePages}
          fetchMoreReferencePages={fetchMoreReferencePages}
          fetchReferenceProducts={fetchReferenceProducts}
          fetchMoreReferenceProducts={fetchMoreReferenceProducts}
          assignReferencesAttributeId={assignReferencesAttributeId}
          loading={loading}
        >
          {({
            change,
            data,
            validationErrors,
            isSaveDisabled,
            handlers,
            submit,
            attributeRichTextGetters,
          }) => {
            const nonSelectionAttributes = data.attributes.filter(
              byAttributeScope(VariantAttributeScope.NOT_VARIANT_SELECTION),
            );
            const selectionAttributes = data.attributes.filter(
              byAttributeScope(VariantAttributeScope.VARIANT_SELECTION),
            );
            const media = getSelectedMedia(productMedia, data.media);
            const errors = [...apiErrors, ...validationErrors];
            const priceVariantErrors = [...channelErrors, ...validationErrors];

            return (
              <>
                <Grid variant="inverted">
                  <div>
                    <ProductVariantNavigation
                      productId={productId}
                      current={variant?.id}
                      defaultVariantId={defaultVariantId}
                      fallbackThumbnail={variant?.product?.thumbnail?.url}
                      variants={variant?.product.variants}
                      onReorder={onVariantReorder}
                    />
                  </div>
                  <div>
                    <ProductVariantName
                      value={data.variantName}
                      onChange={change}
                      disabled={loading}
                      errors={errors}
                    />
                    <CardSpacer />
                    <VariantDetailsChannelsAvailabilityCard
                      variant={variant}
                      listings={data.channelListings}
                      disabled={loading}
                      onManageClick={toggleManageChannels}
                    />
                    {nonSelectionAttributes.length > 0 && (
                      <>
                        <Attributes
                          title={intl.formatMessage(messages.nonSelectionAttributes)}
                          attributes={nonSelectionAttributes}
                          attributeValues={attributeValues}
                          loading={loading}
                          disabled={loading}
                          errors={errors}
                          onChange={handlers.selectAttribute}
                          onMultiChange={handlers.selectAttributeMultiple}
                          onFileChange={handlers.selectAttributeFile}
                          onReferencesRemove={handlers.selectAttributeReference}
                          onReferencesAddClick={onAssignReferencesClick}
                          onReferencesReorder={handlers.reorderAttributeValue}
                          fetchAttributeValues={fetchAttributeValues}
                          fetchMoreAttributeValues={fetchMoreAttributeValues}
                          onAttributeSelectBlur={onAttributeSelectBlur}
                          richTextGetters={attributeRichTextGetters}
                        />
                        <CardSpacer />
                      </>
                    )}
                    {selectionAttributes.length > 0 && (
                      <>
                        <Attributes
                          title={intl.formatMessage(messages.selectionAttributesHeader)}
                          attributes={selectionAttributes}
                          attributeValues={attributeValues}
                          loading={loading}
                          disabled={loading}
                          errors={errors}
                          onChange={handlers.selectAttribute}
                          onMultiChange={handlers.selectAttributeMultiple}
                          onFileChange={handlers.selectAttributeFile}
                          onReferencesRemove={handlers.selectAttributeReference}
                          onReferencesAddClick={onAssignReferencesClick}
                          onReferencesReorder={handlers.reorderAttributeValue}
                          fetchAttributeValues={fetchAttributeValues}
                          fetchMoreAttributeValues={fetchMoreAttributeValues}
                          onAttributeSelectBlur={onAttributeSelectBlur}
                          richTextGetters={attributeRichTextGetters}
                        />
                        <CardSpacer />
                      </>
                    )}
                    <ProductVariantMedia
                      disabled={loading || productMedia.length === 0}
                      media={media}
                      placeholderImage={placeholderImage}
                      onImageAdd={toggleModal}
                    />
                    <CardSpacer />
                    <ProductVariantPrice
                      disabled={!variant}
                      productVariantChannelListings={data.channelListings.map(channel => ({
                        ...channel.data,
                        ...channel.value,
                      }))}
                      errors={priceVariantErrors}
                      loading={loading}
                      onChange={handlers.changeChannels}
                    />
                    <CardSpacer />
                    <ProductVariantCheckoutSettings
                      data={data}
                      disabled={loading}
                      errors={errors}
                      onChange={change}
                    />
                    <CardSpacer />

                    <ProductShipping
                      data={data}
                      disabled={loading}
                      errors={errors}
                      weightUnit={variant?.weight?.unit || defaultWeightUnit}
                      onChange={change}
                    />
                    <CardSpacer />
                    <ProductStocks
                      productVariantChannelListings={data.channelListings.map(channel => ({
                        ...channel.data,
                        ...channel.value,
                      }))}
                      warehouses={mapEdgesToItems(searchWarehousesResult?.data?.search) ?? []}
                      fetchMoreWarehouses={fetchMoreWarehouses}
                      hasMoreWarehouses={
                        searchWarehousesResult?.data?.search?.pageInfo?.hasNextPage
                      }
                      data={data}
                      disabled={loading}
                      hasVariants={true}
                      errors={errors}
                      stocks={data.stocks}
                      onChange={handlers.changeStock}
                      onFormDataChange={change}
                      onWarehouseStockAdd={handlers.addStock}
                      onWarehouseStockDelete={handlers.deleteStock}
                      onWarehouseConfigure={onWarehouseConfigure}
                      isCreate={false}
                    />
                    <CardSpacer />
                    <Metadata data={data} onChange={handlers.changeMetadata} />
                  </div>
                </Grid>
                <Savebar>
                  <Savebar.DeleteButton onClick={onDelete} />
                  <Savebar.Spacer />
                  <Savebar.CancelButton onClick={() => navigate(productUrl(productId))} />
                  <Savebar.ConfirmButton
                    transitionState={saveButtonBarState}
                    onClick={submit}
                    disabled={isSaveDisabled}
                  />
                </Savebar>
                {canOpenAssignReferencesAttributeDialog && (
                  <AssignAttributeValueDialog
                    entityType={getReferenceAttributeEntityTypeFromAttribute(
                      assignReferencesAttributeId,
                      data.attributes,
                    )}
                    confirmButtonState={"default"}
                    products={referenceProducts}
                    pages={referencePages}
                    collections={referenceCollections}
                    categories={referenceCategories}
                    attribute={data.attributes.find(({ id }) => id === assignReferencesAttributeId)}
                    hasMore={handlers.fetchMoreReferences?.hasMore}
                    open={canOpenAssignReferencesAttributeDialog}
                    onFetch={handlers.fetchReferences}
                    onFetchMore={handlers.fetchMoreReferences?.onFetchMore}
                    loading={handlers.fetchMoreReferences?.loading}
                    onClose={onCloseDialog}
                    onSubmit={attributeValues =>
                      handleAssignReferenceAttribute(attributeValues, data, handlers)
                    }
                  />
                )}
                {variant && (
                  <>
                    <VariantChannelsDialog
                      channelListings={variant.product.channelListings}
                      selectedChannelListings={data.channelListings}
                      open={isManageChannelsModalOpen}
                      onClose={toggleManageChannels}
                      onConfirm={handlers.updateChannels}
                    />
                    <ProductVariantMediaSelectDialog
                      onClose={toggleModal}
                      onConfirm={handlers.changeMedia}
                      open={isModalOpened}
                      media={productMedia}
                      selectedMedia={data.media}
                    />
                  </>
                )}
              </>
            );
          }}
        </ProductVariantUpdateForm>
      </DetailPageLayout.Content>
      {!!variant?.preorder && (
        <ProductVariantEndPreorderDialog
          confirmButtonState={variantDeactivatePreoderButtonState}
          onClose={() => setIsEndPreorderModalOpened(false)}
          onConfirm={handleDeactivatePreorder}
          open={isEndPreorderModalOpened}
          variantGlobalSoldUnits={variant?.preorder?.globalSoldUnits}
        />
      )}
    </DetailPageLayout>
  );
};

ProductVariantPage.displayName = "ProductVariantPage";
export default ProductVariantPage;
