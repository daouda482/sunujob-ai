
// import { NavLink } from "react-router-dom";
// import {
//   LayoutDashboard,
//   Users,
//   Building2,
//   BriefcaseBusiness,
//   FileText,
//   Bell,
//   ChartNoAxesCombined,
//   ClipboardList,
//   ShieldCheck,
//   BookOpen,
//   Headset,
//   X,
//   PanelLeftClose,
// } from "lucide-react";

// const navigationGroups = [
//   {
//     title: "GÉNÉRAL",
//     items: [
//       {
//         label: "Tableau de bord",
//         path: "/admin/dashboard",
//         icon: LayoutDashboard,
//         end: true,
//       },
//     ],
//   },
//   {
//     title: "GESTION DE LA PLATEFORME",
//     items: [
//       {
//         label: "Utilisateurs",
//         path: "/admin/users",
//         icon: Users,
//       },
//       {
//         label: "Entreprises",
//         path: "/admin/companies",
//         icon: Building2,
//       },
//       {
//         label: "Offres d'emploi",
//         path: "/admin/jobs",
//         icon: BriefcaseBusiness,
//       },
//       {
//         label: "Candidatures",
//         path: "/admin/applications",
//         icon: FileText,
//       },
//       {
//         label: "Notifications",
//         path: "/admin/notifications",
//         icon: Bell,
//       },
//     ],
//   },
//   {
//     title: "CONTRÔLE ET ANALYSE",
//     items: [
//       {
//         label: "Rapports",
//         path: "/admin/reports",
//         icon: ChartNoAxesCombined,
//       },
//       {
//         label: "Journal d'activité",
//         path: "/admin/audit-logs",
//         icon: ClipboardList,
//       },
//       {
//         label: "Modération",
//         path: "/admin/moderation",
//         icon: ShieldCheck,
//       },
//       {
//         label: "Vérifications",
//         path: "/admin/verifications",
//         icon: ShieldCheck,
//       },
//       {
//         label: "Catalogue",
//         path: "/admin/catalog",
//         icon: BookOpen,
//       },
//       {
//         label: "Support",
//         path: "/admin/support",
//         icon: Headset,
//       },
//     ],
//   },
// ];

// export default function AdminSidebar({
//   mobileOpen,
//   onClose,
// }) {
//   return (
//     <>
//       {mobileOpen && (
//         <button
//           type="button"
//           aria-label="Fermer le menu"
//           onClick={onClose}
//           className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
//         />
//       )}

//       <aside
//         className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-white/10 bg-[#101827] text-slate-300 transition-transform duration-300 lg:translate-x-0 ${
//           mobileOpen ? "translate-x-0" : "-translate-x-full"
//         }`}
//       >
//         <div className="flex h-[82px] shrink-0 items-center justify-between border-b border-white/10 px-6">
//           <NavLink
//             to="/admin/dashboard"
//             onClick={onClose}
//             className="flex items-center gap-3 no-underline"
//           >
//             <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-lg font-black text-slate-950 shadow-lg shadow-emerald-500/20">
//               S
//             </div>

//             <div>
//               <p className="m-0 text-lg font-extrabold tracking-tight text-white">
//                 SunuJob <span className="text-emerald-400">AI</span>
//               </p>
//               <p className="m-0 text-[10px] font-semibold uppercase tracking-[2px] text-slate-500">
//                 Administration
//               </p>
//             </div>
//           </NavLink>

//           <button
//             type="button"
//             onClick={onClose}
//             aria-label="Fermer le menu"
//             className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
//           >
//             <X size={19} />
//           </button>
//         </div>

//         <div className="flex-1 overflow-y-auto px-4 py-6">
//           {navigationGroups.map((group) => (
//             <div key={group.title} className="mb-7">
//               <p className="mb-3 px-3 text-[10px] font-bold tracking-[1.8px] text-slate-500">
//                 {group.title}
//               </p>

//               <nav className="space-y-1">
//                 {group.items.map((item) => {
//                   const Icon = item.icon;

//                   return (
//                     <NavLink
//                       key={item.path}
//                       to={item.path}
//                       end={item.end}
//                       onClick={onClose}
//                       className={({ isActive }) =>
//                         `group flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium no-underline transition-all duration-200 ${
//                           isActive
//                             ? "bg-emerald-400/10 text-emerald-300 shadow-sm shadow-black/10"
//                             : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
//                         }`
//                       }
//                     >
//                       {({ isActive }) => (
//                         <>
//                           <Icon
//                             size={18}
//                             strokeWidth={isActive ? 2.4 : 1.8}
//                             className={
//                               isActive
//                                 ? "text-emerald-400"
//                                 : "text-slate-500 transition-colors group-hover:text-slate-200"
//                             }
//                           />

//                           <span className="flex-1">{item.label}</span>

//                           {isActive && (
//                             <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
//                           )}
//                         </>
//                       )}
//                     </NavLink>
//                   );
//                 })}
//               </nav>
//             </div>
//           ))}
//         </div>

//         <div className="shrink-0 border-t border-white/10 p-4">
//           <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-3">
//             <div className="flex items-center gap-3">
//               <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-400">
//                 <PanelLeftClose size={18} />
//               </div>

//               <div className="min-w-0">
//                 <p className="m-0 text-xs font-semibold text-white">
//                   Espace sécurisé
//                 </p>
//                 <p className="m-0 mt-1 text-[10px] text-slate-500">
//                   Administration SunuJob AI
//                 </p>
//               </div>
//             </div>
//           </div>

//           <p className="mb-0 mt-4 text-center text-[10px] text-slate-600">
//             © {new Date().getFullYear()} SunuJob AI · Sénégal
//           </p>
//         </div>
//       </aside>
//     </>
//   );
// }
