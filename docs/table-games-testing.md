<!-- version v1.0 -->
# Kiểm thử năm game mới

Cập nhật ngày 18/10/2026. Phạm vi: Domino, Cờ tỷ phú, Tiến lên miền Nam,
Xì dách và Ma sói; thư viện có tổng cộng 20 game.

## Luật và vòng đời

`npm run test:table` đạt **72/72 kiểm thử**:

| Game | Kiểm thử | Ván tự động có seed |
| --- | ---: | ---: |
| Domino | 13 | 300 |
| Cờ tỷ phú | 21 | 300 |
| Tiến lên miền Nam | 11 | 300 |
| Xì dách | 13 | 1.000 |
| Ma sói | 14 | 300 |

Tổng cộng **2.200 ván** đi đến kết quả. Kiểm tra thao tác sai, điều kiện thắng,
chuyển lượt, bảo toàn bài/quân hoặc sổ xu và giới hạn kết thúc. Tiến lên còn so
phép liệt kê nước đi với cách duyệt toàn bộ tập con. Ma sói kiểm tra góc nhìn
riêng, bảo vệ, soi, phiếu hòa và tiếp tục ván khi người chơi đã bị loại.

`node --test tests/uno.test.cjs tests/lifecycle.test.js tests/core.test.js`
đạt **26/26**, kiểm tra thêm UNO, bộ hẹn giờ khi tạm dừng/đóng/chơi lại và
các chức năng Delivery Dash liên quan. Đây là các bộ đã chạy cho lần mở rộng
này; không phải tuyên bố đã chạy lại toàn bộ `npm test` của các game khác.

## Trình duyệt và thiết bị mô phỏng

- Chạy Playwright **1.55.1** trên Windows, headless.
- Chromium dùng Microsoft Edge **155.0.4283.45**; lần kiểm tra Cờ tỷ phú cuối
  dùng Edge **155.0.4283.62** sau khi trình duyệt trên máy cập nhật.
- WebKit **26.0**, bản runtime `webkit-2203` của Playwright.
- Máy chủ kiểm thử: `node scripts/serve.js 4185`, địa chỉ `http://127.0.0.1:4185`.
- Có mở trực tiếp `index.html` bằng `file://` để kiểm tra các game cục bộ.

| Viewport (CSS px) | DPR | Điều khiển |
| --- | ---: | --- |
| 320 × 740 | 2 | Chạm, điện thoại nhỏ |
| 390 × 844 | 2 | Chạm, điện thoại |
| 820 × 1180 | 2 | Chạm, máy tính bảng |
| 1366 × 900 | 1 | Chuột/bàn phím, máy tính |

**Không tạo máy ảo iOS/iPadOS và không sử dụng iPhone/iPad thật.** Đây là
mô phỏng viewport, DPR, cảm ứng và engine trình duyệt trên Windows; không
đủ để khẳng định đã kiểm tra toàn bộ hành vi Safari trên phần cứng Apple.

## Các bước kiểm tra

1. Mở thư viện, đếm đủ 20 game, kiểm tra ảnh SVG, lọc Bài/Nhập vai và tìm kiếm
   không dấu. Mở đủ năm game qua liên kết `#play/<id>` và qua `file://`.
2. Bấm bắt đầu. Bộ kiểm thử thay hàm tạo ván trong trang bằng các tình huống
   có seed để tái hiện được lỗi; mọi thao tác vẫn đi qua nút và logic thật.
   Các thế kết thúc được dựng riêng để kiểm tra thắng/chơi lại, không coi
   chúng là một ván ngẫu nhiên chơi từ khai cuộc. Ván đầy đủ nằm ở unit test.
3. Domino: quân mở đầu, nối hai phía, hủy chọn phía, máy đáp lượt và hết quân.
   Tiến lên: chọn nhiều lá, gợi ý, đánh bằng Enter, lượt máy và hết bài.
4. Cờ tỷ phú: tung xúc xắc, mua/bỏ qua, trừ xu, nâng cấp, chuyển lượt, giới
   hạn ván; chọn ô bằng danh sách để đọc chi tiết trên điện thoại.
5. Xì dách: chưa đủ 16 không dừng, rút/dừng, nhà cái tự chơi, thắng/thua và
   chia lại. Lá úp không xuất hiện trong nhãn DOM. Kiểm tra cả tay bài năm
   lá và kết quả Ngũ linh ở bốn viewport.
6. Ma sói: chưa biết vai không lộ trong thẻ/nhãn, soi vào sổ tay riêng, bảo
   vệ không lặp, chặn tấn công, bỏ phiếu, thắng và người chết xem tự động.
7. Tạm dừng ngay sau thao tác để chứng minh trạng thái không thay đổi khi
   timer đang chờ; tiếp tục để máy chơi. Đóng game khi đang chờ và xác nhận
   trạng thái cũ không tiếp tục bị sửa. Chơi lại và nút chơi tiếp đều hoạt động.
8. Ở mỗi viewport, chạm các nút thật, kiểm tra kích thước vùng bấm, dùng
   `elementFromPoint` xác nhận nút không bị che, kiểm tra tràn ngang và lưu
   ảnh. Ghi nhận lỗi JavaScript/console; lượt đạt yêu cầu không có lỗi.

UNO cũng đã qua kiểm thử chức năng trên cả hai engine sau khi thư viện đổi
từ 15 thành 20 game: **2 lượt, 9 nhóm kiểm tra mỗi lượt**.

Kết quả cuối: **52 trường hợp đạt**, gồm 10 lượt chức năng (5 game × 2 engine),
40 lượt responsive (5 game × 2 engine × 4 viewport) và 2 lượt mở offline/lọc
thư viện. Cờ tỷ phú và Xì dách đã được chạy lại trên cả hai engine sau khi sửa
CSS; các lượt cuối thay thế kết quả cũ của chính hai game này.

## Lỗi phát hiện trong quá trình kiểm tra

Ở chiều rộng 320 px, vùng `.game-board-area` của Xì dách kế thừa `flex: 1`
và `min-height: 0`, co thấp hơn nội dung bàn. Bàn bài tràn xuống và che nút
**Dừng bài**. Đã sửa CSS riêng của game để vùng bàn giữ chiều cao nội dung
và cuộn cùng màn chơi. Kiểm thử giữ nguyên yêu cầu nút phải bấm được,
đồng thời bổ sung trường hợp năm lá và nút **Chia ván mới**.

Cờ tỷ phú có cùng nguyên nhân: nội dung bàn cao hơn vùng chứa, đè lên nhãn
**Máy đi nhanh** và phần **Luật chơi** ở cả màn hình nhỏ lẫn máy tính.
Đã sửa CSS riêng để giữ chiều cao nội dung. Bộ kiểm thử bổ sung chạm nhãn
đổi tốc độ máy và mở phần luật; kiểm tra này vẫn yêu cầu nút không bị che.

## Chạy lại

```powershell
npm.cmd run test:table
# Một terminal riêng:
node scripts/serve.js 4185
```

Với bộ Playwright đã có trong workspace này, chạy ở terminal khác:

```powershell
$env:PLAYWRIGHT_MODULE = Join-Path (Get-Location) 'test-results/caro-tooling/node_modules/playwright'
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) 'test-results/playwright-browsers'
$env:TEST_URL = 'http://127.0.0.1:4185'
$env:TABLE_BROWSERS = 'chromium,webkit'
$env:TABLE_GAMES = 'domino,monopoly,tienlen,xidach,werewolf'
$env:TABLE_FUNCTIONAL_ONLY = ''
$env:TABLE_RESPONSIVE_ONLY = ''
$env:SCREENSHOTS = 'test-results/table-games'
npm.cmd run test:table:browser
```

Nếu tự cài Playwright ở `node_modules`, bỏ biến `PLAYWRIGHT_MODULE` và cài
browser runtime tương ứng với phiên bản đã cài. Playwright chỉ là công cụ
kiểm thử; trang game không cần dependency này để hoạt động.

Ảnh và báo cáo JSON nằm trong `test-results` (không đưa vào Git). Báo cáo
cuối là `test-results/table-games-final/results.json`, liệt kê 52 trường hợp
không trùng, đường dẫn ảnh, phiên bản browser và báo cáo nguồn. Các lần chạy
trước vẫn giữ lỗi đã phát hiện để đối chiếu. Nguồn kiểm tra lại nằm ở
`test-results/table-xidach-final` và `test-results/table-monopoly-final`;
kiểm tra hồi quy UNO ở `test-results/table-uno-regression`.
