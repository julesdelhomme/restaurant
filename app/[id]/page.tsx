import ClientMenuPage from "../page";

type RestaurantRootPageProps = {
  params: {
    id: string;
  };
};

export default function RestaurantRootPage({ params }: RestaurantRootPageProps) {
  return <ClientMenuPage key={params.id} />;
}
