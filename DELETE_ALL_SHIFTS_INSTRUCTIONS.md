# Удаление всех смен из базы данных

## ⚠️ ВНИМАНИЕ: Эта операция удалит все смены без возможности восстановления!

## Способ 1: Через Supabase Dashboard

1. Зайдите в ваш проект на [supabase.com](https://supabase.com)
2. Перейдите в **SQL Editor**
3. Скопируйте и выполните SQL из файла `DELETE_ALL_SHIFTS.sql`

## Способ 2: Через SQL Editor (прямой запрос)

```sql
DELETE FROM shifts;
```

Если нужно также удалить связанные фотографии:

```sql
DELETE FROM shift_photos WHERE shift_id IN (SELECT id FROM shifts);
DELETE FROM shifts;
```

## Способ 3: Через Supabase Dashboard UI

1. Зайдите в **Database** > **Tables**
2. Откройте таблицу `shifts`
3. Нажмите на кнопку **Delete all rows** (если доступна)
4. Подтвердите удаление

## Проверка после удаления

После удаления убедитесь, что:
- В таблице `shifts` нет записей
- Статистика в админ меню сбросилась на 0
- Форма создания смены работает корректно
