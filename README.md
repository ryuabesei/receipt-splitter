# Receipt Splitter

買った商品を手入力して、2人の立て替え精算を計算するアプリです。

## できること

- 商品名を入力
- 値段を入力
- 2人のもの / 自分だけ / 相手だけを選択
- 自分が払った / 相手が払ったを選択
- 最後にどちらがどちらへ何円払うべきかを自動計算
- メールアドレスとパスワードで新規登録・ログイン
- アカウントごとに2人の名前と履歴をクラウド保存
- 完了した精算を過去履歴として保存

## 開き方

Supabase を設定したうえで、`index.html` をブラウザで開くか Vercel にデプロイして使います。

## Supabase の設定

1. Supabase の SQL Editor で [`supabase/schema.sql`](supabase/schema.sql) を実行します。
2. Authentication の Email 設定でメール確認を有効にしている場合、新規登録後に届くメールから確認します。
3. Authentication の URL Configuration に、本番 URL と `http://127.0.0.1:8767` を追加します。

ブラウザに含まれるのは Supabase の公開用キーだけです。`service_role` キーは絶対にアプリへ設定しません。
