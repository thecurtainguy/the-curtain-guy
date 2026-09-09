# Rental packages (true bundles)

## Understanding summary

- Real curated **packages** alongside regular inventory on Rentals
- All-in package price; components for composition/fulfillment + public Includes
- Fixed recipe × package qty; package owns stock, photos, color variants
- Customers see Includes; packages may include products and services
- Rentals: stacked sections (Packages first, then Items)
- Non-goals v1: component color mapping, sum-of-parts pricing, derived stock, linear-ft packages

## Decision log

| Decision | Choice | Alternatives | Why |
| --- | --- | --- | --- |
| What is a package | Curated bundle listing | UI-only split | Need real admin BOM + pricing |
| Pricing | All-in admin price | Sum of parts / either | Customer sees one kit price |
| Qty scaling | Fixed recipe × N | Linear-ft packages | Simpler v1 kits |
| Colors | Reuse product color variants on package | Smart component color map | Same admin/public UX; map later |
| Includes visibility | Public Includes list | Teaser / hidden | Trust + clarity |
| Stock | Package own stock | Derived from components | Simple ops for v1 |
| Page layout | Stacked Packages → Items | Tabs / filter only | Packages feel featured |
| Services in recipe | Yes (products + services) | Products only | Admin can bake install into kit price |
| Data model | `kind: package` + `product_package_components` | Reuse formula_includes / separate packages table | Clear; keeps linear-ft BOMs separate |
| Cart | One priced package line + includes snapshot | Expand priced component lines | Matches all-in pricing |
| Configurator | Simple qty only | Linear-ft on packages | Fixed kits |

## Final design

### Data

- Extend `products.kind` check: `'product' | 'service' | 'package'`
- Table `product_package_components`:
  - `id`, `created_at`
  - `package_product_id` → products
  - `component_product_id` → products (product or service only)
  - `quantity` > 0
  - `sort_order`
- Unique `(package_product_id, component_product_id)`
- Package uses existing price, stock, gallery, color variants, `is_public`

### Admin

- Kind = Package → Package contents picker (qty per package)
- Configurator forced to `simple`
- Hide linear-ft / formula-includes for packages
- Require ≥1 component before public
- Block self / nested package components

### Public

- Hero copy: rentals / packages + items (not “everything is packages”)
- Catalog: Packages section then Items; hide Packages until ≥1 public package
- Package page: colors, qty, Includes, all-in price
- Checkout logistics (full-service / transport) unchanged
- Cart: one line; includes snapshot for estimate/admin

### Rules

- No auto decrement of component stock in v1
- No package→component color sync in v1
- Inactive/missing components flagged in admin

## Implementation plan

1. Migration: kind + `product_package_components` + RLS
2. Types/lib: ProductKind, CRUD for package components, public load
3. Admin editor: Package kind + contents UI + validation
4. Rentals page: split sections + copy (EN/FR)
5. Package detail/configurator/cart: Includes + single priced line
6. Verify: create package, publish, browse, add to cart
