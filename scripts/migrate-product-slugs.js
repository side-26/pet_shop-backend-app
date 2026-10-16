import connectDB, { disconnectDB } from '#configs/db.config.js';
import { ProductModel } from '#entities/products/products.model.js';

import { buildProductSlug } from '../src/entities/products/products.helpers.js';

const BATCH_SIZE = 500;

const addOperation = async (operations, operation) => {
  operations.push(operation);
  if (operations.length < BATCH_SIZE) return;
  await ProductModel.bulkWrite(operations);
  operations.length = 0;
};

const makeUniqueSlug = (slug, usedSlugs) => {
  let uniqueSlug = slug;
  let suffix = 2;
  while (usedSlugs.has(uniqueSlug)) {
    const suffixValue = `-${suffix}`;
    uniqueSlug = `${slug.slice(0, slug.length - suffixValue.length)}${suffixValue}`;
    suffix += 1;
  }
  usedSlugs.add(uniqueSlug);
  return uniqueSlug;
};

let cursor;
try {
  await connectDB();
  cursor = ProductModel.find()
    .populate({ path: 'category', populate: { path: 'petType' } })
    .populate('subCategory')
    .cursor();

  const operations = [];
  const usedSlugs = new Set();
  let migrated = 0;
  let unchanged = 0;

  for await (const product of cursor) {
    const category = product.category;
    const petType = category?.petType;
    if (!category?.title || !petType?.title) {
      throw new Error(
        `محصول ${product._id} دسته‌بندی یا نوع حیوان معتبر ندارد`,
      );
    }
    const slug = makeUniqueSlug(
      buildProductSlug({
        title: product.title,
        petTypeTitle: petType.title,
        categoryTitle: category.title,
        subCategoryTitle: product.subCategory?.title,
      }),
      usedSlugs,
    );
    if (product.slug === slug) {
      unchanged += 1;
      continue;
    }
    await addOperation(operations, {
      updateOne: { filter: { _id: product._id }, update: { $set: { slug } } },
    });
    migrated += 1;
  }
  if (operations.length) await ProductModel.bulkWrite(operations);
  console.log(
    `مهاجرت نامک محصولات کامل شد: ${migrated} به‌روزرسانی، ${unchanged} بدون تغییر`,
  );
} finally {
  await cursor?.close();
  await disconnectDB();
}
