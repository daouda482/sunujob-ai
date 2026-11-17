
// import { useState } from "react";
// import { Outlet, useLocation, Link } from "react-router-dom";
// import {
//   Menu,
//   Bell,
//   Search,
//   ChevronRight,
//   ShieldCheck,
// } from "lucide-react";

// import AdminSidebar from "./AdminSidebar.jsx";

// const pageTitles = {
//   "/admin/dashboard": {
//     title: "Tableau de bord",
//     description: "Vue d'ensemble de votre plateforme de recrutement.",
//   },
//   "/admin/users": {
//     title: "Utilisateurs",
//     description: "Gérez les comptes et les accès de la plateforme.",
//   },
//   "/admin/companies": {
//     title: "Entreprises",
//     description: "Suivez les entreprises inscrites sur SunuJob AI.",
//   },
//   "/admin/jobs": {
//     title: "Offres d'emploi",
//     description: "Supervisez les offres publiées sur la plateforme.",
//   },
//   "/admin/applications": {
//     title: "Candidatures",
//     description: "Consultez et suivez les candidatures reçues.",
//   },
//   "/admin/notifications": {
//     title: "Notifications",
//     description: "Consultez les notifications de l'administration.",
//   },
//   "/admin/reports": {
//     title: "Rapports",
//     description: "Consultez les rapports de la plateforme.",
//   },
//   "/admin/audit-logs": {
//     title: "Journal d'activité",
//     description: "Suivez les opérations effectuées sur la plateforme.",
//   },
//   "/admin/moderation": {
//     title: "Modération",
//     description: "Examinez les signalements et les contenus.",
//   },
//   "/admin/verifications": {
//     title: "Vérifications",
//     description: "Gérez les demandes de vérification.",
//   },
//   "/admin/catalog": {
//     title: "Catalogue",
//     description: "Administrez les éléments du catalogue.",
//   },
//   "/admin/support": {
//     title: "Support",
//     description: "Suivez les demandes d'assistance.",
//   },
// };

// export default function AdminLayout() {
//   const [mobileOpen, setMobileOpen] = useState(false);
//   const location = useLocation();

//   const currentPage =
//     pageTitles[location.pathname] || {
//       title: "Administration",
//       description: "Espace de gestion de SunuJob AI.",
//     };

//   return (
//     <div className="min-h-screen bg-[#0b1220] text-slate-100">
//       <AdminSidebar
//         mobileOpen={mobileOpen}
//         onClose={() => setMobileOpen(false)}
//       />

//       <div className="min-h-screen lg:pl-[270px]">
//         <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#101827]/95 backdrop-blur-xl">
//           <div className="flex min-h-[82px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-9">
//             <div className="flex min-w-0 items-center gap-3">
//               <button
//                 type="button"
//                 onClick={() => setMobileOpen(true)}
//                 aria-label="Ouvrir le menu"
//                 className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-slate-300 transition hover:bg-white/10 lg:hidden"
//               >
//                 <Menu size={20} />
//               </button>

//               <div className="min-w-0">
//                 <div className="mb-1 hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[1.7px] text-slate-500 sm:flex">
//                   <span>Administration</span>
//                   <ChevronRight size={12} />
//                   <span className="text-emerald-400">
//                     SunuJob AI
//                   </span>
//                 </div>

//                 <h1 className="truncate text-lg font-bold tracking-tight text-white sm:text-xl">
//                   {currentPage.title}
//                 </h1>

//                 <p className="mt-1 hidden text-xs text-slate-500 md:block">
//                   {currentPage.description}
//                 </p>
//               </div>
//             </div>

//             <div className="flex shrink-0 items-center gap-2 sm:gap-3">
//               <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 xl:flex">
//                 <Search size={16} className="text-slate-500" />
//                 <span className="text-xs text-slate-500">
//                   Administration SunuJob AI
//                 </span>
//               </div>

//               <Link
//                 to="/admin/notifications"
//                 aria-label="Consulter les notifications"
//                 className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 no-underline transition hover:border-emerald-400/30 hover:bg-emerald-400/10 hover:text-emerald-300"
//               >
//                 <Bell size={18} />
//               </Link>

//               <div className="hidden h-9 w-px bg-white/10 sm:block" />

//               <div className="flex items-center gap-2 sm:gap-3">
//                 <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950">
//                   <ShieldCheck size={18} />
//                 </div>

//                 <div className="hidden sm:block">
//                   <p className="m-0 text-xs font-semibold text-white">
//                     Administrateur
//                   </p>
//                   <p className="m-0 mt-1 text-[10px] text-slate-500">
//                     Espace sécurisé
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </header>

//         <main className="min-h-[calc(100vh-82px)] px-4 py-6 sm:px-6 sm:py-8 lg:px-9">
//           <div className="mx-auto w-full max-w-[1600px]">
//             <Outlet />
//           </div>
//         </main>

//         <footer className="border-t border-white/[0.06] px-4 py-5 text-center text-[11px] text-slate-600 sm:px-6 lg:px-9">
//           SunuJob AI · Conçu au Sénégal 🇸🇳
//         </footer>
//       </div>
//     </div>
//   );
// }
