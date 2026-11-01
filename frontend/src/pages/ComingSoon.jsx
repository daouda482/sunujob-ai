
import { Link } from "react-router-dom";

export default function ComingSoon({ title = "Page en préparation" }) {
  return (
    <main className="container py-5 text-center">
      <i className="bi bi-tools display-3 text-primary"></i>
      <h1 className="fw-bold mt-4">{title}</h1>
      <p className="text-secondary">
        Cette fonctionnalité sera connectée à notre backend Django
        dans les prochaines étapes.
      </p>
      <Link to="/" className="btn btn-primary mt-3">
        Retour à l'accueil
      </Link>
    </main>
  );
}