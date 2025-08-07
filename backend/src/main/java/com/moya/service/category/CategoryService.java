package com.moya.service.category;

import com.moya.domain.category.Category;
import com.moya.domain.category.CategoryRepository;
import com.moya.service.category.command.CategoryInfoCommand;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {
    private final CategoryRepository categoryRepository;

    @Transactional
    public List<CategoryInfoCommand> findAll(){
        List<Category> categories = categoryRepository.findAll();
        List<CategoryInfoCommand> cate = categories.stream()
                .map(category -> CategoryInfoCommand.builder()
                        .categoryId(category.getId())
                        .categoryName(category.getName())
                        .build())
                .toList();

        return cate;
    }
}
