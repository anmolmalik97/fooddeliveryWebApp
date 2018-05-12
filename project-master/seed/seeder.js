var food = require('../models/food');

var mongoose = require('mongoose');

mongoose.connect("mongodb://localhost/onlinefoodapp");

var foods = [
    new food({
        category: 'north',
        image: 'http://www.experiencesofagastronomad.com/wp-content/uploads/2016/08/aloo-paratha.1024x1024-2-600x397.jpg',
        name: 'Alooo paratha',
        description: 'Tandoori paratha stuffed with aloo,served with butter and mint sauce',
        price: 40
    }),

    new food({
        category: 'north',
        image: 'http://www.ndtv.com/cooks/images/chicken.butter.masala%20%281%29.jpg',
        name: 'Butter chiceken',
        description: 'highly rated and most famous dish by our team',
        price: 400
    }),

     new food({
        category: 'north',
        image: 'http://www.sanjeevkapoor.com/UploadFiles/RecipeImages/Dal-Makhani-KhaanaKhazana.jpg',
        name: 'Dal makhani',
        description: 'Black urad beans simmered in creamy gravy sauteed with tomatoes-onions and mild spices',
        price: 200
    })


];

var done = 0;
for (var i = 0; i < foods.length; i++) {
    foods[i].save(function(err, result) {
        done++;
        if (done === foods.length) {
            exit();
        }
    });
}

function exit() {
    mongoose.disconnect();
}