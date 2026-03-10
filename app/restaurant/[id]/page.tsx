import MenuPage from "../../page";

type RestaurantPublicPageProps = {
  params: {
    id: string;
  };
};

export default function RestaurantPublicPage({ params }: RestaurantPublicPageProps) {
  return <MenuPage key={params.id} />;
}
