import { Route } from "@dashboard/components/Router";
import { sectionNames } from "@dashboard/intl";
import { asSortParams } from "@dashboard/utils/sort";
import { parse as parseQs } from "qs";
import React from "react";
import { useIntl } from "react-intl";
import { RouteComponentProps, Switch } from "react-router-dom";

import { WindowTitle } from "../components/WindowTitle";
import {
  modelTypesPath,
  pageTypeAddPath,
  PageTypeListUrlQueryParams,
  PageTypeListUrlSortField,
  pageTypePath,
  PageTypeUrlQueryParams,
} from "./urls";
import PageTypeCreate from "./views/PageTypeCreate";
import PageTypeDetailsComponent from "./views/PageTypeDetails";
import PageTypeListComponent from "./views/PageTypeList";

const PageTypeList: React.FC<RouteComponentProps<{}>> = ({ location }) => {
  const qs = parseQs(location.search.substr(1)) as any;
  const params: PageTypeListUrlQueryParams = asSortParams(qs, PageTypeListUrlSortField);

  return <PageTypeListComponent params={params} />;
};

interface PageTypeDetailsRouteParams {
  id: string;
}

const PageTypeDetails: React.FC<RouteComponentProps<PageTypeDetailsRouteParams>> = ({ match }) => {
  const qs = parseQs(location.search.substr(1));
  const params: PageTypeUrlQueryParams = qs;

  return <PageTypeDetailsComponent id={decodeURIComponent(match.params.id)} params={params} />;
};

export const PageTypeRouter: React.FC = () => {
  const intl = useIntl();

  return (
    <>
      <WindowTitle title={intl.formatMessage(sectionNames.modelTypes)} />
      <Switch>
        <Route exact path={modelTypesPath} component={PageTypeList} />
        <Route exact path={pageTypeAddPath} component={PageTypeCreate} />
        <Route path={pageTypePath(":id")} component={PageTypeDetails} />
      </Switch>
    </>
  );
};
PageTypeRouter.displayName = "PageTypeRouter";
export default PageTypeRouter;
