// @ts-strict-ignore
import { DashboardCard } from "@dashboard/components/Card";
import Checkbox from "@dashboard/components/Checkbox";
import ResponsiveTable from "@dashboard/components/ResponsiveTable";
import { TableButtonWrapper } from "@dashboard/components/TableButtonWrapper/TableButtonWrapper";
import TableCellAvatar from "@dashboard/components/TableCellAvatar";
import TableHead from "@dashboard/components/TableHead";
import { TablePaginationWithContext } from "@dashboard/components/TablePagination";
import TableRowLink from "@dashboard/components/TableRowLink";
import { SaleDetailsFragment, VoucherDetailsFragment } from "@dashboard/graphql";
import { productVariantEditPath } from "@dashboard/products/urls";
import { getLoadableList, mapEdgesToItems } from "@dashboard/utils/maps";
import { TableBody, TableCell, TableFooter } from "@material-ui/core";
import { DeleteIcon, IconButton } from "@saleor/macaw-ui";
import { Button, Skeleton } from "@saleor/macaw-ui-next";
import React from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { maybe, renderCollection } from "../../../misc";
import { ListActions, ListProps } from "../../../types";
import { messages } from "./messages";
import { useStyles } from "./styles";

export interface SaleVariantsProps extends ListProps, ListActions {
  variants: SaleDetailsFragment["variants"] | VoucherDetailsFragment["variants"];
  onVariantAssign: () => void;
  onVariantUnassign: (id: string) => void;
}

const numberOfColumns = 5;
const DiscountVariants: React.FC<SaleVariantsProps> = props => {
  const {
    variants: discountVariants,
    disabled,
    onVariantAssign,
    onVariantUnassign,
    isChecked,
    selected,
    toggle,
    toggleAll,
    toolbar,
  } = props;
  const classes = useStyles(props);
  const intl = useIntl();

  const variants = mapEdgesToItems(discountVariants);

  return (
    <DashboardCard>
      <DashboardCard.Header>
        <DashboardCard.Title>
          {intl.formatMessage(messages.discountVariantsHeader)}
        </DashboardCard.Title>
        <DashboardCard.Toolbar>
          <Button onClick={onVariantAssign} data-test-id="assign-variant" variant="secondary">
            <FormattedMessage {...messages.discountVariantsButton} />
          </Button>
        </DashboardCard.Toolbar>
      </DashboardCard.Header>
      <ResponsiveTable>
        <colgroup>
          <col />
          <col className={classes.colProductName} />
          <col className={classes.colVariantName} />
          <col className={classes.colType} />
          <col className={classes.colActions} />
        </colgroup>
        <TableHead
          colSpan={numberOfColumns}
          selected={selected}
          disabled={disabled}
          items={variants}
          toggleAll={toggleAll}
          toolbar={toolbar}
        >
          <TableCell className={classes.colProductName}>
            <span className={variants?.length > 0 && classes.colNameLabel}>
              <FormattedMessage {...messages.discountVariantsTableProductHeader} />
            </span>
          </TableCell>
          <TableCell className={classes.colVariantName}>
            <FormattedMessage {...messages.discountVariantsTableVariantHeader} />
          </TableCell>
          <TableCell className={classes.colType}>
            <FormattedMessage {...messages.discountVariantsTableProductHeader} />
          </TableCell>
          <TableCell className={classes.colActions} />
        </TableHead>
        <TableFooter>
          <TableRowLink>
            <TablePaginationWithContext colSpan={numberOfColumns} />
          </TableRowLink>
        </TableFooter>
        <TableBody>
          {renderCollection(
            getLoadableList(discountVariants),
            variant => {
              const isSelected = variant ? isChecked(variant.id) : false;

              return (
                <TableRowLink
                  hover={!!variant}
                  key={variant ? variant.id : "skeleton"}
                  href={variant && productVariantEditPath(variant.id)}
                  className={classes.tableRow}
                  selected={isSelected}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      disabled={disabled}
                      disableClickPropagation
                      onChange={() => toggle(variant.id)}
                    />
                  </TableCell>
                  <TableCellAvatar
                    className={classes.colProductName}
                    thumbnail={maybe(() => variant.product.thumbnail.url)}
                  >
                    {maybe<React.ReactNode>(() => variant.product.name, <Skeleton />)}
                  </TableCellAvatar>
                  <TableCell className={classes.colType}>
                    {maybe<React.ReactNode>(() => variant.name, <Skeleton />)}
                  </TableCell>
                  <TableCell className={classes.colType}>
                    {maybe<React.ReactNode>(() => variant.product.productType.name, <Skeleton />)}
                  </TableCell>
                  <TableCell className={classes.colActions}>
                    <TableButtonWrapper>
                      <IconButton
                        variant="secondary"
                        disabled={!variant || disabled}
                        onClick={event => {
                          event.stopPropagation();
                          onVariantUnassign(variant.id);
                        }}
                      >
                        <DeleteIcon color="primary" />
                      </IconButton>
                    </TableButtonWrapper>
                  </TableCell>
                </TableRowLink>
              );
            },
            () => (
              <TableRowLink>
                <TableCell colSpan={numberOfColumns}>
                  <FormattedMessage {...messages.discountVariantsNotFound} />
                </TableCell>
              </TableRowLink>
            ),
          )}
        </TableBody>
      </ResponsiveTable>
    </DashboardCard>
  );
};

DiscountVariants.displayName = "DiscountVariants";
export default DiscountVariants;
