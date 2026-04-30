export default function ChaliahPage({ params }: { params: { slug: string } }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          Profil Chaliah: {params.slug}
        </h1>
        <div className="card p-8 border rounded-lg">
          <p className="text-muted-foreground">
            Page de profil du Chaliah - Contenu à venir
          </p>
        </div>
      </div>
    </div>
  );
}
