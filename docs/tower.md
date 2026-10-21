<!-- version v1.0 -->
# Thủ thành

Game 2D chơi đơn nguyên bản, chạy hoàn toàn trong trình duyệt. Giữ thành trì qua 12 đợt trên một trong ba bản đồ: **Thung lũng xanh**, **Ốc đảo**, **Đèo sương**. Mỗi bản đồ có đường tiến quân và 8 bệ xây khác nhau. Đổi bản đồ bắt đầu ván mới.

## Cách chơi

- Khởi đầu với 240 xu và 20 sinh lực. Chọn bệ trên bản đồ hoặc trong danh sách, rồi chọn tháp để xây.
- Chủ động bấm **Bắt đầu đợt** khi đã chuẩn bị xong. Có thể xây, nâng cấp và bán ngay trong đợt.
- Quái thường, quái nhanh và quái giáp lần lượt xuất hiện; đợt 6 và 12 có thủ lĩnh. Thủ lĩnh lọt cổng làm mất 5 sinh lực, mỗi quái khác mất 1.
- Hạ quái nhận 10 xu, quái giáp 16 xu, thủ lĩnh 100 xu. Hoàn thành đợt nhận thêm `35 + 5 × số đợt` xu.
- Mỗi tháp có 3 cấp. Nâng cấp lần đầu tốn 90% giá xây, lần hai 120%; bán hoàn 60% tổng chi phí đã đầu tư, làm tròn xuống.
- Sau khi hạ hoặc để lọt tất cả quái đợt 12 mà còn sinh lực, bạn thắng. Hết sinh lực lập tức thua. Không tự mở đợt kế tiếp.

| Tháp | Giá | Sát thương cấp 1 | Chu kỳ | Tầm | Đặc tính |
|---|---:|---:|---:|---:|---|
| Tháp tên | 70 | 13 | 0,44 giây | 165 | Bắn nhanh, một mục tiêu |
| Tháp băng | 90 | 10 | 0,80 giây | 155 | Chậm 45% trong 1,6 giây; đánh lại làm mới thời gian, không cộng dồn hệ số |
| Đại bác | 110 | 37 | 1,30 giây | 165 | Lan trong bán kính 65 |

Tất cả tháp ưu tiên quái tiến xa nhất trên đường trong tầm. Đạn bay tới mục tiêu; nếu mục tiêu đã chết hoặc lọt cổng, đạn đó biến mất. Đại bác nổ tại vị trí mục tiêu khi trúng. Tầm tính theo đơn vị trên bản đồ 900 × 500, không phụ thuộc kích thước màn hình. Cấp 2/3 tăng sát thương lên 1,7/2,65 lần, tăng tầm 12/24 và giảm chu kỳ 8%/16%; bán kính lan tăng 8 mỗi cấp.

Chọn **Tốc độ ×2** để tăng tốc cả quái, đạn và tháp. Tạm dừng dùng nút chung trên thanh game. Chuyển tab hoặc đóng game dừng mô phỏng, không chạy ngầm. Có thể dùng bàn phím Tab/Enter và danh sách bệ thay cho thao tác trên bản đồ nhỏ.

## Cân bằng và kiểm thử

Chiến thuật tham chiếu: bắt đầu ba tháp tên ở bệ 2, 3, 4; thêm băng ở bệ 1 và 5, đại bác ở bệ 6 và 7, tên ở bệ 8; sau đó nâng cấp đều. Kiểm thử mô phỏng xác nhận chiến thuật này thắng đủ ba bản đồ bằng tài nguyên kiếm được trong game, không thêm xu. Đây là bản đầu dễ tiếp cận; không có bản đồ ngẫu nhiên, PvP, thanh toán hay tài nguyên ngoài ván.

Logic thuần trong `games/tower-logic.js` dùng bước cố định 20 ms. `tick(state, dt)` nhận giây thực (tối đa 60 giây/lần), tích lũy phần lẻ và không đánh rơi bước khi chia thời gian khác nhau. Tốc độ giao diện nhân `dt`, trong khi vòng lặp và vòng đời do `ArcadeShared.createScope` quản lý. Đạn, hiệu ứng và quái đều thuộc state của ván.

Chạy `node --test tests/tower.test.cjs` để kiểm tra luật xây/nâng/bán, nhắm mục tiêu, đạn lan/chậm, phần thưởng một lần, thắng/thua, bất biến chia bước thời gian, 3 ván tham chiếu và 24 ván với thứ tự xây/thời gian bước có seed. `node tests/browser-tower.cjs` dùng bộ chạy browser chung: hành động thật, tạm dừng, kết quả thắng/thua có fixture, đổi bản đồ, đóng ván và các kích thước 320/390/820/1366 trên Chromium/WebKit. Thiết bị iOS chỉ được mô phỏng viewport/touch nếu chạy bộ này; không phải kiểm thử iPad/iPhone thật.

API `ArcadeTower`: `createGame({map})`, `build(state,pad,type)`, `upgrade(state,pad)`, `sell(state,pad)`, `startWave(state)`, `tick(state,dt)`, `stats(tower)`, `upgradeCost(tower)`, `score(state)`. Hành động trả boolean. `phase`: `build`, `wave`, `won`, `lost`; `wave` từ 0 đến 12. Không dùng đồng hồ hoặc ngẫu nhiên toàn cục trong logic.
