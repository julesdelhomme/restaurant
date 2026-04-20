import { hasMissingColumnError, toLoggableSupabaseError } from "../runtime-data-utils";
import {
  DISH_IMAGES_BUCKET,
  RESTAURANT_BANNERS_BUCKET,
  RESTAURANT_LOGOS_BUCKET,
  supabaseKey,
  supabaseUrl,
} from "../runtime-core-utils";

type BuildManagerDishAssetsArgsInput = {
  scopedRestaurantId: string;
  managerCoreState: any;
  managerEditorUiState: any;
  fetchDishes: () => Promise<void> | void;
};

export function buildManagerDishAssetsArgs({
  scopedRestaurantId,
  managerCoreState,
  managerEditorUiState,
  fetchDishes,
}: BuildManagerDishAssetsArgsInput) {
  const { state, setters } = managerCoreState;

  return {
    scopedRestaurantId,
    restaurant: state.restaurant,
    restaurantForm: state.restaurantForm,
    setRestaurantForm: setters.setRestaurantForm,
    setRestaurant: setters.setRestaurant,
    setIsUploadingRestaurantLogo: managerEditorUiState.setIsUploadingRestaurantLogo,
    setIsUploadingRestaurantBanner: managerEditorUiState.setIsUploadingRestaurantBanner,
    setIsUploadingRestaurantBackground: managerEditorUiState.setIsUploadingRestaurantBackground,
    setIsUploadingRestaurantWelcome: managerEditorUiState.setIsUploadingRestaurantWelcome,
    setImagePreviewUrl: managerEditorUiState.setImagePreviewUrl,
    setIsUploadingImage: managerEditorUiState.setIsUploadingImage,
    DISH_IMAGES_BUCKET,
    RESTAURANT_LOGOS_BUCKET,
    RESTAURANT_BANNERS_BUCKET,
    supabaseUrl,
    supabaseKey,
    setFormData: managerEditorUiState.setFormData,
    setDishToDelete: managerEditorUiState.setDishToDelete,
    setShowDeleteModal: managerEditorUiState.setShowDeleteModal,
    hasMissingColumnError,
    toLoggableSupabaseError,
    setDishes: setters.setDishes,
    setEditingDish: managerEditorUiState.setEditingDish,
    editingDish: managerEditorUiState.editingDish,
    formData: managerEditorUiState.formData,
    fetchDishes,
    dishToDelete: managerEditorUiState.dishToDelete,
  };
}
