export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Bienvenue sur <span className="text-primary">ChlouhIN</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            La plateforme pour découvrir et connecter la communauté juive
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="card p-6 border rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Découvrir</h3>
              <p className="text-muted-foreground">
                Explorez les Beth Habad et trouvez des communautés près de chez vous
              </p>
            </div>
            <div className="card p-6 border rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Connecter</h3>
              <p className="text-muted-foreground">
                Rejoignez la communauté et partagez vos expériences
              </p>
            </div>
            <div className="card p-6 border rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Participer</h3>
              <p className="text-muted-foreground">
                Prenez part aux événements et activités locales
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
