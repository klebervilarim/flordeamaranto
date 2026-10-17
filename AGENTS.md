<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Store decants as a product type plus normalized volume using the existing products fields; this keeps catalog, editing and spreadsheets interoperable.
- Generate missing decant SKUs deterministically from name, brand and volume using src/lib/decants.ts; repeated imports must update the same product rather than create duplicates.
- Product image AI uses an admin-verified streaming server route, with ordered style and optional real-product references; generated photos are uploaded and applied only after explicit review, never creating a catalog record.
