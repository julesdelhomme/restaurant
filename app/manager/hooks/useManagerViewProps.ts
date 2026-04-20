import RestaurantQrCard from "../../components/RestaurantQrCard";
import AppearanceUI from "../components/AppearanceUI";
import CardDesigner from "../components/CardDesigner";
import ConfigGeneral from "../components/ConfigGeneral";
import ConfigMail from "../components/ConfigMail";
import ConfigSocials from "../components/ConfigSocials";
import ManagerMenuPanel from "../components/ManagerMenuPanel";
import ManagerStatsPanel from "../components/ManagerStatsPanel";
import SafeResponsiveContainer from "../components/SafeResponsiveContainer";
import StaffAndRooms from "../components/StaffAndRooms";
import {
  buildDishEditorModalProps,
  buildManagerAccessAlertsProps,
  buildManagerAppearancePanelProps,
  buildManagerCategorySideModalsProps,
  buildManagerDashboardSectionProps,
  buildManagerHeaderSectionProps,
  buildManagerMenuPanelProps,
  buildManagerOverlaysProps,
  buildManagerStaffAndRoomsProps,
  buildManagerStatsPanelProps,
} from "../lib/tab-props-builders";
import { useManagerCardDesigner } from "./useManagerCardDesigner";

export function useManagerViewProps(params: any) {
  const managerAppearancePanelProps = buildManagerAppearancePanelProps(params);

  const managerStatsPanelProps = buildManagerStatsPanelProps({
    ...params,
    SafeResponsiveContainer,
  });

  const managerMenuPanelProps = buildManagerMenuPanelProps({
    ...params,
    ManagerStatsPanel,
    managerStatsPanelProps,
  });

  const managerStaffAndRoomsProps = buildManagerStaffAndRoomsProps(params);

  const managerCategorySideModalsProps = buildManagerCategorySideModalsProps(params);

  const managerAccessAlertsProps = buildManagerAccessAlertsProps(params);

  const managerHeaderSectionProps = buildManagerHeaderSectionProps({
    ...params,
    ManagerMenuPanel,
    managerMenuPanelProps,
  });

  const managerOverlaysProps = buildManagerOverlaysProps({
    ...params,
    managerCategorySideModalsProps,
  });

  const { cardDesignerProps } = useManagerCardDesigner(params);

  const managerDashboardSectionProps = buildManagerDashboardSectionProps({
    ...params,
    AppearanceUI,
    CardDesigner,
    ConfigGeneral,
    ConfigMail,
    ConfigSocials,
    RestaurantQrCard,
    StaffAndRooms,
    cardDesignerProps,
    managerAppearancePanelProps,
    managerStaffAndRoomsProps,
  });

  const dishEditorModalProps = buildDishEditorModalProps(params);

  return {
    managerAppearancePanelProps,
    managerStatsPanelProps,
    managerMenuPanelProps,
    managerStaffAndRoomsProps,
    managerCategorySideModalsProps,
    managerAccessAlertsProps,
    managerHeaderSectionProps,
    managerOverlaysProps,
    managerDashboardSectionProps,
    dishEditorModalProps,
  };
}
