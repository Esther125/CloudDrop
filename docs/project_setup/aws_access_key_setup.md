# AWS Access Key SetUp

## 建立個人的 IAM User

1. AWS console → IAM → Users

2. Create user

    <img src="..\assets\aws_access_key_setup\user_create.png" width=80%>

3. User details 中 user name 用自己的名字

    <img src="..\assets\aws_access_key_setup\user_name.png" width=80%>

4. Set permissions 中按照下圖設定，加入 **Clouddrop-dev** 的 User Group

    <img src="..\assets\aws_access_key_setup\user_permission.png" width=80%>

    註：目前在 Clouddrop-dev 中開放的權限為 S3 和 DynamoDB 的 Full access，未來有需要增減權限的時候要到 IAM → User Groups 中修改，不調整個別 User 的權限
   
    <img src="..\assets\aws_access_key_setup\group.png" width=80%>

6. 設定完後就可以 Create user

## 取得 Access Key

1.  點進建好的 user 裡，點右上角 **Create access key**

    <img src="..\assets\aws_access_key_setup\key_create.png" width=80%>

2.  按下圖設定後，Next → Create access key

    <img src="..\assets\aws_access_key_setup\key_use_case.png" width=80%>

3.  依照取得的 access keys 完成 .env 檔內容

    <img src="..\assets\aws_access_key_setup\key_show.png" width=80%>

    ```
    # AWS
    AWS_ACCESS_KEY_ID=
    AWS_SECRET_ACCESS_KEY=
    AWS_REGION=
    ```

    -   Access key 複製到 .env 中的 AWS_ACCESS_KEY_ID
    -   Secret access key 複製到 .env 中的 AWS_SECRET_ACCESS_KEY
    -   AWS_REGION 設定為 ap-northeast-1

    註：一個 User 最多只能申請 2 次 access key，所以拿到後記得存好
