import MenuPage from "../../page";

type VitrinePublicPageProps = {
  params: {
    id: string;
  };
};

export default function VitrinePublicPage({ params }: VitrinePublicPageProps) {
  return <MenuPage key={params.id} />;
}
